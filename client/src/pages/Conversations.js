import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import VideoCall from '../components/VideoCall';

const Conversations = () => {
  const { currentUser } = useContext(AuthContext);
  const { socket, notifications, removeNotification, isUserOnline, incomingCall, clearIncomingCall } = useContext(SocketContext);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [activeCall, setActiveCall] = useState(null);
  const navigate = useNavigate();

  // Fetch conversations on mount and when component receives focus
  useEffect(() => {
    fetchConversations();
    
    // Add an event listener to refresh conversations when the window regains focus
    const handleFocus = () => {
      fetchConversations();
    };
    
    window.addEventListener('focus', handleFocus);
    
    // Clean up event listener on unmount
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Listen for new messages and update conversations
  useEffect(() => {
    if (socket) {
      // Listen for new messages
      socket.on('newMessage', (message) => {
        // Update conversations list with new message
        setConversations(prevConversations => {
          return prevConversations.map(conv => {
            if (conv._id === message.conversationId) {
              return {
                ...conv,
                lastMessage: message.text,
                lastMessageTime: message.createdAt,
                unreadCount: {
                  ...conv.unreadCount,
                  [currentUser._id]: (conv.unreadCount?.[currentUser._id] || 0) + 1
                }
              };
            }
            return conv;
          });
        });
      });

      // Clean up on unmount
      return () => {
        socket.off('newMessage');
      };
    }
  }, [socket, currentUser._id]);
  
  // Handle incoming calls
  useEffect(() => {
    if (incomingCall) {
      // Find the conversation this call is coming from
      const conversation = conversations.find(conv => 
        conv._id === incomingCall.conversationId
      );
      
      if (conversation) {
        const caller = conversation.participants.find(
          p => p._id === incomingCall.caller._id
        );
        
        if (caller) {
          setActiveCall({
            callId: incomingCall.callId,
            recipientId: caller._id,
            recipientName: caller.name,
            isInitiator: false,
            conversationId: conversation._id
          });
        }
      }
    }
  }, [incomingCall, conversations]);

  // Handle notifications
  useEffect(() => {
    if (notifications.length > 0) {
      // Update conversations with new notifications
      setConversations(prevConversations => {
        return prevConversations.map(conv => {
          const notification = notifications.find(n => n.conversationId === conv._id);
          if (notification) {
            return {
              ...conv,
              lastMessage: notification.message.text,
              lastMessageTime: notification.message.createdAt,
              unreadCount: {
                ...conv.unreadCount,
                [currentUser._id]: (conv.unreadCount?.[currentUser._id] || 0) + 1
              }
            };
          }
          return conv;
        });
      });
    }
  }, [notifications, currentUser._id]);

  const fetchConversations = async () => {
    try {
      if (!refreshing) {
        setLoading(true);
      }
      setError('');
      const res = await axios.get('/api/conversations');
      if (res.data) {
        setConversations(res.data);
      } else {
        setError('No conversations found');
      }
      setLoading(false);
      setRefreshing(false);
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setError(err.response?.data?.message || 'Failed to load conversations. Please try refreshing the page.');
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Handle manual refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchConversations();
  };

  // Get the other participant in a conversation
  const getOtherParticipant = (conversation) => {
    return conversation.participants.find(
      p => p._id !== currentUser._id
    );
  };

  // Format the last message time
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    
    // If today, show time
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // If this year, show month and day
    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
    
    // Otherwise show full date
    return date.toLocaleDateString();
  };

  // Get unread count for current user
  const getUnreadCount = (conversation) => {
    if (!conversation.unreadCount) return 0;
    return conversation.unreadCount[currentUser._id] || 0;
  };

  // Handle conversation click
  const handleConversationClick = (conversationId) => {
    // Remove notification for this conversation
    removeNotification(conversationId);
    
    // Navigate to conversation
    navigate(`/conversations/${conversationId}`);
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

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Active Video Call */}
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
    
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Conversations</h1>
        <div className="flex space-x-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {refreshing ? (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            Refresh
          </button>
          <Link
            to="/search-user"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Find New User
          </Link>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      
      {conversations.length === 0 ? (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No conversations</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by finding a user to chat with.
          </p>
          <div className="mt-6">
            <Link
              to="/search-user"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Find User
            </Link>
          </div>
        </div>
      ) : (
        <ul className="divide-y divide-gray-200 bg-white shadow overflow-hidden sm:rounded-md">
          {conversations.map((conversation) => {
            const otherUser = getOtherParticipant(conversation);
            const unreadCount = getUnreadCount(conversation);
            const isOnline = otherUser ? isUserOnline(otherUser._id) : false;
            
            return (
              <li key={conversation._id}>
                <div className="px-4 py-4 sm:px-6 flex items-center justify-between">
                  <div 
                    onClick={() => handleConversationClick(conversation._id)} 
                    className="flex items-center flex-1 hover:bg-gray-50 cursor-pointer p-2 rounded"
                  >
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center relative">
                      <span className="text-indigo-800 font-medium text-sm">
                        {otherUser?.name?.charAt(0) || '?'}
                      </span>
                      {isOnline && (
                        <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-400 ring-2 ring-white"></span>
                      )}
                    </div>
                    <div className="ml-4 flex-1">
                      <div className="flex justify-between">
                        <div className="text-sm font-medium text-gray-900">{otherUser?.name}</div>
                        <div className="text-xs text-gray-500">
                          {formatTime(conversation.lastMessageTime)}
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <div className="text-sm text-gray-500">
                          @{otherUser?.username} {isOnline && <span className="text-green-500 text-xs ml-1">• Online</span>}
                        </div>
                        {unreadCount > 0 && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                      {conversation.lastMessage && (
                        <div className={`mt-1 text-sm ${unreadCount > 0 ? 'font-semibold text-gray-900' : 'text-gray-500'} truncate`}>
                          {conversation.lastMessage}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="ml-4">
                    <Link
                      to={`/user/${otherUser?._id}`}
                      className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Profile
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default Conversations; 