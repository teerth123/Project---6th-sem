import React, { useState, useEffect, useRef, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import VideoCall from '../components/VideoCall';

const Conversation = () => {
  const { conversationId } = useParams();
  const { currentUser } = useContext(AuthContext);
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
  } = useContext(SocketContext);
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
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Fetch conversation and messages
  useEffect(() => {
    const fetchConversationAndMessages = async () => {
      try {
        // Check if conversationId is a MongoDB ObjectId or a user ID
        const isObjectId = /^[0-9a-fA-F]{24}$/.test(conversationId);

        let conversationData;

        if (isObjectId) {
          // Try to get existing conversation
          try {
            // First try to get conversation details directly
            const conversationRes = await axios.get(`/api/conversations/${conversationId}`);
            conversationData = conversationRes.data;
          } catch (err) {
            // If that fails, it might be a user ID, so try to start a conversation
            if (err.response?.status === 404) {
              const startRes = await axios.post(`/api/conversations/start/${conversationId}`);

              // If we got a conversation object back, use it
              if (startRes.data._id) {
                conversationData = startRes.data;
              }
              // If we got a request/pending status, show appropriate message and redirect after delay
              else if (startRes.data.isRequested || startRes.data.isPending) {
                const message = startRes.data.message || 'Cannot start conversation yet';
                setError(message);

                // If connection request is pending from the other user, provide option to accept
                if (startRes.data.isPending && startRes.data.pendingUserId) {
                  // Set state to show accept button
                  setHasPendingRequest(true);
                  setPendingUserId(startRes.data.pendingUserId);
                } else {
                  // Set a timer to navigate back after showing the message
                  setTimeout(() => {
                    navigate('/conversations');
                  }, 3000);
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

        // Get messages for the conversation
        const messagesRes = await axios.get(`/api/conversations/${conversationData._id}/messages`);
        setMessages(messagesRes.data);

        setLoading(false);
      } catch (err) {
        console.error('Error fetching conversation:', err);
        setError('Failed to load conversation');
        setLoading(false);

        // Navigate back to conversations list after showing error
        setTimeout(() => {
          navigate('/conversations');
        }, 3000);
      }
    };

    fetchConversationAndMessages();
  }, [conversationId, navigate]);

  // Join conversation room when socket is ready
  useEffect(() => {
    if (socket && conversation?._id) {
      // Join the conversation room
      joinConversation(conversation._id);

      // Listen for new messages
      socket.on('newMessage', (message) => {
        setMessages(prev => [...prev, message]);
      });

      // Listen for typing status
      socket.on('userTyping', ({ userId, username, isTyping }) => {
        if (isTyping) {
          setTypingUser(username);
        } else {
          setTypingUser(null);
        }
      });

      // Clean up on unmount
      return () => {
        leaveConversation(conversation._id);
        socket.off('newMessage');
        socket.off('userTyping');
      };
    }
  }, [socket, conversation, joinConversation, leaveConversation]);

  // Handle incoming calls
  useEffect(() => {
    // Check if the incoming call is for this conversation
    if (incomingCall && conversation) {
      const otherUser = getOtherParticipant();

      // Only show call UI if it's from the user we're chatting with
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
    if (socket && conversation?._id) {
      // Send typing status
      sendTypingStatus(conversation._id, true);

      // Clear previous timeout
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }

      // Set new timeout to stop typing status after 2 seconds
      const timeout = setTimeout(() => {
        sendTypingStatus(conversation._id, false);
      }, 2000);

      setTypingTimeout(timeout);
    }
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

    try {
      let messageData = { text: newMessage };
      let fileUrl;
      let fileType;

      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        console.log('frontend here');

        const uploadRes = await axios.post('/api/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        fileUrl = uploadRes.data.url;
        fileType = uploadRes.data.type;
        messageData = { ...messageData, fileUrl, type: fileType };
      }

      // Send message via API
      const res = await axios.post(`/api/conversations/${conversation._id}/messages`, messageData);

      // Add the new message to the list
      setMessages([...messages, res.data]);

      // Also send via socket for real-time
      socketSendMessage(conversation._id, newMessage, fileUrl, fileType);

      // Reset typing status
      sendTypingStatus(conversation._id, false);

      // Clear input and selected file
      setNewMessage('');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Reset file input
      }
      setSending(false);
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
      setSending(false);
    }
  };

  // Handle accepting connection request
  const handleAcceptConnection = async () => {
    if (!pendingUserId) return;

    try {
      setLoading(true);

      // Accept the connection request
      await axios.put(`/api/users/accept/${pendingUserId}`);

      // Try to start the conversation again
      const startRes = await axios.post(`/api/conversations/start/${pendingUserId}`);

      // If we got a conversation, redirect to it
      if (startRes.data._id) {
        navigate(`/conversations/${startRes.data._id}`);
      } else {
        setError('Failed to start conversation after accepting connection');
        setTimeout(() => {
          navigate('/conversations');
        }, 2000);
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
      console.log('VIDEO CALL BUTTON CLICKED - START FUNCTION TRIGGERED');
      console.log('Starting video call...');

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

      // Check if other user is online
      if (typeof isUserOnline === 'function' && !isUserOnline(otherUser._id)) {
        console.error('Cannot start call: User is offline');
        setError('Cannot start call: User is offline');
        return;
      }

      console.log('Calling user:', otherUser.name, 'with ID:', otherUser._id);
      console.log('Using conversation ID:', conversation._id);

      if (!conversation._id || !otherUser._id) {
        console.error('Invalid IDs for call:', {
          conversationId: conversation?._id,
          recipientId: otherUser?._id
        });
        setError('Cannot start call: Invalid IDs');
        return;
      }

      // Call the initiateVideoCall function from context
      console.log('Initiating video call with params:', {
        conversationId: conversation._id,
        recipientId: otherUser._id
      });

      const callData = await initiateVideoCall(conversation._id, otherUser._id);

      console.log('Call data received from API:', callData);

      if (callData && callData.callId) {
        console.log('Setting up active call with ID:', callData.callId);
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // If we have a pending request that needs to be accepted
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

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center">
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
          onClick={handleStartVideoCall}
          className="ml-auto bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          Start Video Call
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((message) => (
          <div key={message._id} className={`flex ${message.sender === currentUser._id ? 'justify-end' : 'justify-start'} mb-4`}>
            <div className={`rounded-lg p-2 ${message.sender === currentUser._id ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-900'}`}>
              {message.type === 'text' && <p>{message.text}</p>}
              {message.type === 'image' && <img src={message.fileUrl} alt="Image" className="max-w-xs rounded-lg" />}
              {message.type === 'video' && (
                <video controls className="max-w-xs rounded-lg">
                  <source src={message.fileUrl} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
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
          </div>
        ))}
        <div ref={messagesEndRef}></div>
      </div>

      {/* Message Input */}
      <div className="bg-white border-t border-gray-200 px-4 py-3">
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
            disabled={sending}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            Send
          </button>
        </form>
        {selectedFile && (
          <div className="mt-2 text-sm text-gray-600">
            Selected: {selectedFile.name}
          </div>
        )}
      </div>
    </div>
  );
};

export default Conversation;