import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import VideoCall from '../components/VideoCall';
import VideoMessage from '../components/VideoMessage';

const Conversation = () => {
  const { conversationId } = useParams();
  const { currentUser } = useContext(AuthContext) || {};
  const {
    socket,
    joinConversation,
    leaveConversation,
    sendMessage: socketSendMessage,
    sendTypingStatus,
    isUserOnline,
    initiateVideoCall,
    incomingCall,
    clearIncomingCall
  } = useContext(SocketContext) || {};
  const navigate = useNavigate();

  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [typingUser, setTypingUser] = useState(null);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [pendingUserId, setPendingUserId] = useState(null);
  const [activeCall, setActiveCall] = useState(null);

  // --- NEW STATE FOR MEDIA VIEWER ---
  const [modalMedia, setModalMedia] = useState(null); // Stores the message object to display in modal
  // --- END NEW STATE ---

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const modalRef = useRef(null); // Ref for the modal background for closing on outside click

  // Fetch conversation and messages
  useEffect(() => {
    const fetchConversationAndMessages = async () => {
      try {
        const isObjectId = /^[0-9a-fA-F]{24}$/.test(conversationId);
        let conversationData;

        if (isObjectId) {
          try {
            const conversationRes = await axios.get(`/api/conversations/${conversationId}`);
            conversationData = conversationRes.data;
          } catch (err) {
            if (err.response?.status === 404) {
              const startRes = await axios.post(`/api/conversations/start/${conversationId}`);
              if (startRes.data._id) {
                conversationData = startRes.data;
              } else if (startRes.data.isRequested || startRes.data.isPending) {
                const message = startRes.data.message || 'Cannot start conversation yet';
                setError(message);
                if (startRes.data.isPending && startRes.data.pendingUserId) {
                  setHasPendingRequest(true);
                  setPendingUserId(startRes.data.pendingUserId);
                } else {
                  setTimeout(() => { navigate('/conversations'); }, 3000);
                }
                setLoading(false);
                return;
              }
            } else {
              throw err;
            }
          }
        } else {
          setError('Invalid conversation ID');
          setLoading(false);
          return;
        }

        setConversation(conversationData);
        const messagesRes = await axios.get(`/api/conversations/${conversationData._id}/messages`);
        setMessages(messagesRes.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching conversation:', err);
        setError('Failed to load conversation');
        setLoading(false);
        setTimeout(() => { navigate('/conversations'); }, 3000);
      }
    };

    fetchConversationAndMessages();
  }, [conversationId, navigate]);

  // Manually trigger message fetch (for debugging)
  const fetchAndUpdateMessages = useCallback(async () => {
    try {
      console.log('Manually fetching latest messages');
      if (!conversation?._id) return;
      
      const messagesRes = await axios.get(`/api/conversations/${conversation._id}/messages`);
      console.log('Fetched messages:', messagesRes.data);
      setMessages(messagesRes.data);
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  }, [conversation]);

  // Socket connection status debug
  useEffect(() => {
    if (socket) {
      console.log('Socket in Conversation component:', {
        id: socket.id,
        connected: socket.connected
      });
      
      // Debug socket event
      socket.emit('debugEvent', { 
        component: 'Conversation',
        conversationId,
        timestamp: new Date()
      });
    } else {
      console.warn('No socket connection in Conversation component');
    }
  }, [socket, conversationId]);

  // Join conversation room when socket is ready
  useEffect(() => {
    if (socket && conversation?._id) {
      console.log('Joining conversation room:', conversation._id);
      const joinSuccess = joinConversation(conversation._id);
      console.log('Join conversation success:', joinSuccess);

      const handleNewMessage = (message) => {
        console.log('New message received in conversation:', message);
        // Check if the message is for the current conversation
        if (message.conversationId === conversation._id) {
          // Add message to state if it's not already there
          setMessages(prev => {
            // Check if message already exists
            if (prev.some(m => m._id === message._id)) {
              console.log('Message already exists in state, skipping');
              return prev;
            }
            const newMessages = [...prev, message];
            console.log('Updated messages:', newMessages);
            return newMessages;
          });
        }
      };

      const handleUserTyping = ({ userId, username, isTyping }) => {
        console.log('Typing status received:', { userId, username, isTyping });
        if (isTyping) {
          setTypingUser(username);
        } else {
          setTypingUser(null);
        }
      };

      console.log('Setting up socket event listeners');
      socket.on('newMessage', handleNewMessage);
      socket.on('userTyping', handleUserTyping);
      socket.on('directMessage', handleDirectMessage);
      socket.on('directNewMessage', handleDirectNewMessage);

      // Periodically check if messages have been updated
      const messageCheckInterval = setInterval(() => {
        console.log('Scheduled message check');
        fetchAndUpdateMessages();
      }, 10000); // Check every 10 seconds

      return () => {
        console.log('Leaving conversation room:', conversation._id);
        leaveConversation(conversation._id);
        socket.off('newMessage', handleNewMessage);
        socket.off('userTyping', handleUserTyping);
        socket.off('directMessage', handleDirectMessage);
        socket.off('directNewMessage', handleDirectNewMessage);
        clearInterval(messageCheckInterval);
      };
    }
  }, [socket, conversation, joinConversation, leaveConversation, fetchAndUpdateMessages]);

  // Debug message rendering
  useEffect(() => {
    console.log('Current messages in state:', messages);
  }, [messages]);

  // Handle incoming calls
  useEffect(() => {
    if (incomingCall && conversation) {
      const otherUser = getOtherParticipant();
      if (incomingCall.caller._id === otherUser?._id) {
        setActiveCall({
          callId: incomingCall.callId,
          recipientId: incomingCall.caller._id,
          recipientName: otherUser.name,
          isInitiator: false,
          conversationId: conversation._id
        });
      }
    }
  }, [incomingCall, conversation]);

  // --- NEW EFFECT FOR CLOSING MODAL ON ESCAPE KEY ---
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape' && modalMedia) {
        setModalMedia(null);
      }
    };
    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [modalMedia]);
  // --- END NEW EFFECT ---

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Get the other participant in the conversation
  const getOtherParticipant = () => {
    if (!conversation) return null;
    return conversation.participants.find(
      p => p._id !== currentUser._id
    );
  };

  // Format message timestamp
  const formatMessageTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Handle typing status
  const handleTyping = () => {
    if (!socket || !conversation?._id) return;

    sendTypingStatus(conversation._id, true);

    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    const timeout = setTimeout(() => {
      sendTypingStatus(conversation._id, false);
    }, 2000);
    setTypingTimeout(timeout);
  };

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file);
  };

  // Trigger file input click
  const handleOpenFilePicker = () => {
    fileInputRef.current.click();
  };

  // Send a new message (text or media)
  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!newMessage.trim() && !selectedFile) return;

    setSending(true);
    setError('');
    
    // Generate a temporary message ID for tracking
    const tempMessageId = `temp-${Date.now()}`;
    console.log(`Creating message with temp ID: ${tempMessageId}`);

    try {
      let messageData = { text: newMessage };
      let fileUrl = '';
      let fileType = 'text';

      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);

        console.log('Uploading file:', selectedFile.name);
        const uploadRes = await axios.post('/api/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        fileUrl = uploadRes.data.url;
        fileType = uploadRes.data.type;
        messageData = { text: newMessage, fileUrl, type: fileType };
        console.log('File uploaded successfully:', uploadRes.data);
      } else {
        messageData.type = 'text';
      }

      console.log('Sending message to server:', messageData);
      
      // Create a temporary message for optimistic UI update
      const tempMessage = {
        _id: tempMessageId,
        conversationId: conversation._id,
        sender: currentUser._id,
        senderName: currentUser.name,
        text: messageData.text,
        type: messageData.type,
        fileUrl: messageData.fileUrl,
        createdAt: new Date(),
        read: false,
        temporary: true
      };
      
      // Add the temporary message to the UI immediately
      console.log('Adding temporary message to UI:', tempMessage);
      setMessages(prev => [...prev, tempMessage]);
      
      // Send the message to the server via API
      console.log(`Posting message to /api/conversations/${conversation._id}/messages`);
      const res = await axios.post(`/api/conversations/${conversation._id}/messages`, messageData);
      const sentMessage = res.data;
      console.log('Message saved on server with ID:', sentMessage._id);

      // Replace the temporary message with the real one from the server
      setMessages(prev => 
        prev.map(msg => 
          msg._id === tempMessageId ? sentMessage : msg
        )
      );

      // Also emit via socket for real-time updates to other clients
      console.log('Emitting message via socket');
      const socketSuccess = socketSendMessage(
        conversation._id, 
        sentMessage.text, 
        sentMessage.fileUrl, 
        sentMessage.type
      );
      console.log('Socket message emission success:', socketSuccess);

      // Stop typing indicator
      sendTypingStatus(conversation._id, false);

      // Reset form
      setNewMessage('');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setSending(false);
      
      // Force scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      
    } catch (err) {
      console.error('Error sending message:', err);
      // Remove any temp message on error
      setMessages(prev => prev.filter(msg => msg._id !== tempMessageId));
      setError('Failed to send message: ' + (err.response?.data?.message || err.message));
      setSending(false);
    }
  };

  // Handle accepting connection request
  const handleAcceptConnection = async () => {
    if (!pendingUserId) return;

    try {
      setLoading(true);
      await axios.put(`/api/users/accept/${pendingUserId}`);
      const startRes = await axios.post(`/api/conversations/start/${pendingUserId}`);

      if (startRes.data._id) {
        navigate(`/conversations/${startRes.data._id}`);
      } else {
        setError('Failed to start conversation after accepting connection');
        setTimeout(() => { navigate('/conversations'); }, 2000);
      }
    } catch (err) {
      console.error('Error accepting connection:', err);
      setError('Failed to accept connection');
      setLoading(false);
    }
  };

  // Handle initiating video call
  const handleStartVideoCall = async () => {
    try {
      if (!conversation) {
        console.error('Cannot start call: No active conversation');
        setError('Cannot start call: No active conversation');
        return;
      }
      const otherUser = getOtherParticipant();
      if (!otherUser) {
        console.error('Cannot start call: No other user found in this conversation');
        setError('Cannot start call: No recipient found');
        return;
      }
      if (typeof isUserOnline === 'function' && !isUserOnline(otherUser._id)) {
        console.error('Cannot start call: User is offline');
        setError('Cannot start call: User is offline');
        return;
      }

      console.log('Initiating video call with params:', {
        conversationId: conversation._id,
        recipientId: otherUser._id
      });

      const callData = await initiateVideoCall(conversation._id, otherUser._id);

      if (callData && callData.callId) {
        setActiveCall({
          callId: callData.callId,
          recipientId: otherUser._id,
          recipientName: otherUser.name,
          isInitiator: true,
          conversationId: conversation._id
        });
      } else {
        console.error('Failed to start call: No call ID received');
        setError('Could not start video call - no call ID received');
      }
    } catch (err) {
      console.error('Error starting video call:', err);
      console.error('Error details:', err.response?.data || err.message);
      setError('Failed to start video call: ' + (err.response?.data?.message || err.message || 'Unknown error'));
    }
  };

  // Handle ending video call
  const handleEndCall = () => {
    setActiveCall(null);
    clearIncomingCall();
  };

  // --- NEW FUNCTION TO OPEN MEDIA MODAL ---
  const openMediaModal = (message) => {
      if (message.type === 'image' || message.type === 'video') {
          setModalMedia(message);
      }
  };
  // --- END NEW FUNCTION ---

  const handleDirectMessage = (message) => {
    console.log('Direct message received in conversation:', message);
    if (message.conversationId === conversation?._id) {
      // Add message to state if it's not already there
      setMessages(prev => {
        // Check if message already exists
        if (prev.some(m => m._id === message._id)) {
          console.log('Direct message already exists in state, skipping');
          return prev;
        }
        const newMessages = [...prev, message];
        console.log('Updated messages with direct message:', newMessages);
        return newMessages;
      });
    }
  };

  const handleDirectNewMessage = (message) => {
    console.log('Direct broadcast message received in conversation:', message);
    if (message.conversationId === conversation?._id) {
      // Add message to state if it's not already there
      setMessages(prev => {
        // Check if message already exists
        if (prev.some(m => m._id === message._id)) {
          console.log('Broadcast message already exists in state, skipping');
          return prev;
        }
        const newMessages = [...prev, message];
        console.log('Updated messages with broadcast message:', newMessages);
        return newMessages;
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (hasPendingRequest && pendingUserId) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-4">
        <div className="bg-white rounded-lg shadow-md p-6 max-w-md w-full">
          <div className="text-center mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <h2 className="text-xl font-semibold mt-2">Connection Request Pending</h2>
            <p className="text-gray-600 mt-1">{error}</p>
          </div>

          <div className="flex flex-col space-y-3">
            <button
              onClick={handleAcceptConnection}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Accept Connection Request
            </button>

            <button
              onClick={() => navigate('/conversations')}
              className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Back to Conversations
            </button>
          </div>
        </div>
      </div>
    );
  }

  const otherUser = getOtherParticipant();
  const isOnline = otherUser ? isUserOnline(otherUser._id) : false;

  return (
    <div className="flex flex-col h-screen">
      {/* Active Video Call UI */}
      {activeCall && (
        <VideoCall
          callId={activeCall.callId}
          recipientId={activeCall.recipientId}
          recipientName={activeCall.recipientName}
          isInitiator={activeCall.isInitiator}
          conversationId={activeCall.conversationId}
          onEndCall={handleEndCall}
        />
      )}

      {/* --- NEW MEDIA VIEWER MODAL --- */}
      {modalMedia && (
        <div
          ref={modalRef}
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (modalRef.current === e.target) {
              setModalMedia(null);
            }
          }}
        >
          <div className="relative max-w-full max-h-full bg-white rounded-lg overflow-hidden shadow-xl">
            {/* Close Button */}
            <button
              onClick={() => setModalMedia(null)}
              className="absolute top-2 right-2 bg-gray-800 text-white rounded-full p-1 z-10 opacity-75 hover:opacity-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Media Content */}
            {modalMedia.type === 'image' && (
              <img
                src={modalMedia.fileUrl}
                alt="Maximized Image"
                className="block max-w-full max-h-screen object-contain"
              />
            )}
            {modalMedia.type === 'video' && (
              <video
                src={modalMedia.fileUrl}
                controls
                className="block max-w-full max-h-screen object-contain"
              >
                Your browser does not support the video tag.
              </video>
            )}
          </div>
        </div>
      )}
      {/* --- END NEW MEDIA VIEWER MODAL --- */}


      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center z-10">
        <Link to="/conversations" className="mr-4 text-gray-500 hover:text-gray-700">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>

        <Link to={`/user/${otherUser?._id}`} className="flex items-center flex-1">
          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center relative">
            <span className="text-indigo-800 font-medium text-sm">
              {otherUser?.name?.charAt(0) || '?'}
            </span>
            {isOnline && (
              <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-400 ring-2 ring-white"></span>
            )}
          </div>

          <div className="ml-3">
            <div className="text-sm font-medium text-gray-900">{otherUser?.name}</div>
            <div className="text-xs text-gray-600">{isOnline ? 'Online' : 'Offline'}</div>
          </div>
        </Link>

        <button
  onClick={() => {
    const videoCallURL = 'https://2d66-2409-40c2-2010-b4c7-7197-2c9f-419c-1bb8.ngrok-free.app/index.html?roomID=myroom123';
    window.open(videoCallURL, '_blank');
  }}
  className="ml-auto bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
>
  Start Video Call
</button>

      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((message) => (
          <div key={message._id} className={`flex ${message.sender === currentUser._id ? 'justify-end' : 'justify-start'} mb-4`}>
            {/* --- WRAPPING DIV ADDED FOR CLICK HANDLING (CORRECTED CLASSNAME SYNTAX) --- */}
            <div
              // Corrected className: removed the extra closing curly brace after the backtick
              className={`rounded-lg p-2 ${message.sender === currentUser._id ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-900'}
                         ${(message.type === 'image' || message.type === 'video') ? 'cursor-pointer' : ''}`}
              onClick={(message.type === 'image' || message.type === 'video') ? () => openMediaModal(message) : undefined}
            >
              {/* EXISTING CODE WITHIN THE MESSAGE BUBBLE - UNCHANGED */}
              {message.type === 'text' && <p>{message.text}</p>}
              {message.type === 'image' && <img src={message.fileUrl} alt="Image" className="max-w-xs rounded-lg" />}
              {message.type === 'video' && (
                <VideoMessage
                  message={message}
                  isMyMessage={message.sender === currentUser._id}
                />
              )}
              {message.type === 'audio' && (
                <audio controls className="max-w-xs rounded-lg">
                  <source src={message.fileUrl} type="audio/mpeg" />
                  Your browser does not support the audio element.
                </audio>
              )}
              {message.type === 'file' && (
                <a href={message.fileUrl} download className="text-indigo-600 hover:underline">
                  Download File
                </a>
              )}
              <div className="text-xs text-gray-500 mt-1">{formatMessageTime(message.createdAt)}</div>
            </div>
            {/* --- END WRAPPING DIV --- */}
          </div>
        ))}
        <div ref={messagesEndRef}></div>
      </div>

      {/* Message Input */}
      <div className="bg-white border-t border-gray-200 px-4 py-3 z-10">
        {typingUser && (
          <div className="text-sm text-gray-500 mb-1">{typingUser} is typing...</div>
        )}
        {error && !hasPendingRequest && (
           <div className="text-sm text-red-600 mb-2">{error}</div>
        )}
        <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleTyping}
            placeholder="Type your message..."
            className="flex-1 border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="button"
            onClick={handleOpenFilePicker}
            className="bg-gray-200 text-gray-600 px-4 py-2 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            Attach File
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <button
            type="submit"
            disabled={sending || (!newMessage.trim() && !selectedFile)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </form>
        {selectedFile && (
          <div className="mt-2 text-sm text-gray-600">
            Selected: {selectedFile.name}
            <button onClick={() => setSelectedFile(null)} className="ml-2 text-red-500 hover:text-red-700">
              Remove
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Conversation;