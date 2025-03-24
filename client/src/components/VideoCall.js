import React, { useEffect, useRef, useState, useContext } from 'react';
import Peer from 'simple-peer';
import axios from 'axios';
import { SocketContext } from '../context/SocketContext';
import { AuthContext } from '../context/AuthContext';

// WebRTC adapter for cross-browser compatibility
const WebRTCPeer = Peer;

const VideoCall = ({ 
  callId, 
  recipientId, 
  recipientName, 
  isInitiator, 
  conversationId,
  onEndCall 
}) => {
  console.log('VideoCall component rendering with props:', {
    callId, recipientId, recipientName, isInitiator, conversationId
  });
  
  const { socket, sendCallSignal, sendCallResponse, endCall: socketEndCall } = useContext(SocketContext);
  const { currentUser } = useContext(AuthContext);
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [stream, setStream] = useState(null);
  const [callStatus, setCallStatus] = useState(isInitiator ? 'calling' : 'receiving');
  const [error, setError] = useState('');

  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();
  
  // Check for WebRTC support
  useEffect(() => {
    const checkBrowserSupport = () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Your browser does not support video calls');
        return false;
      }
      return true;
    };
    
    if (!checkBrowserSupport()) {
      setTimeout(onEndCall, 3000);
    }
  }, [onEndCall]);

  // Initialize media stream and listen for events
  useEffect(() => {
    console.log('VideoCall useEffect running, callStatus:', callStatus);
    
    // Handler for when a call is accepted
    const handleCallAccepted = async (data) => {
      console.log('Call accepted event received:', data);
      if (data.callId === callId) {
        setCallAccepted(true);
        setCallStatus('connected');
        
        // If we're the initiator, start the peer connection
        if (isInitiator) {
          console.log('We are initiator, starting peer connection');
          startPeer();
        }
      }
    };

    // Handler for when a call is declined
    const handleCallDeclined = (data) => {
      console.log('Call declined event received:', data);
      if (data.callId === callId) {
        setCallStatus('declined');
        setTimeout(() => {
          onEndCall();
        }, 2000);
      }
    };

    // Handler for receiving signals from peer
    const handleCallSignal = (data) => {
      console.log('Call signal received:', data);
      if (data.callId === callId) {
        if (connectionRef.current) {
          try {
            console.log('Signaling peer with:', data.signal);
            connectionRef.current.signal(data.signal);
          } catch (err) {
            console.error('Error applying received signal:', err);
            setError('Failed to process incoming connection data');
          }
        } else {
          console.warn('Received signal but connectionRef is not initialized');
          
          // If we're the recipient and we've accepted but peer isn't created yet
          if (!isInitiator && callStatus === 'connected' && !connectionRef.current && stream) {
            console.log('Creating peer as recipient after receiving signal');
            startPeer();
            
            // We need to store the signal and apply it after peer is created
            setTimeout(() => {
              if (connectionRef.current) {
                try {
                  console.log('Applying stored signal to new peer');
                  connectionRef.current.signal(data.signal);
                } catch (err) {
                  console.error('Error applying stored signal:', err);
                }
              }
            }, 500);
          }
        }
      }
    };

    // Set up socket event listeners
    if (socket) {
      console.log('Setting up socket event listeners for video call');
      socket.on('callResponse', (data) => {
        console.log('callResponse event:', data);
        if (data.accepted) {
          handleCallAccepted(data);
        } else {
          handleCallDeclined(data);
        }
      });

      socket.on('callSignal', handleCallSignal);
      
      // Also handle call ended from socket
      socket.on('callEnded', (data) => {
        console.log('callEnded event received:', data);
        if (data.callId === callId) {
          endCall();
        }
      });
    } else {
      console.warn('Socket not available for video call');
    }

    // Get user media (video and audio)
    const getMedia = async () => {
      try {
        console.log('Requesting user media (camera and microphone)');
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: true 
        });
        
        console.log('Media stream obtained', mediaStream);
        setStream(mediaStream);
        
        if (myVideo.current) {
          console.log('Setting local video stream');
          myVideo.current.srcObject = mediaStream;
        } else {
          console.warn('myVideo ref is not ready yet');
        }

        // If we're the call recipient and receiving a call, start the peer when media is ready
        if (!isInitiator && callStatus === 'receiving') {
          console.log('We are recipient, changing status to ready');
          setCallStatus('ready');
        }
      } catch (err) {
        console.error('Failed to get media devices:', err);
        setError('Cannot access camera or microphone: ' + err.message);
      }
    };

    getMedia();

    // Clean up
    return () => {
      console.log('VideoCall component cleanup');
      if (socket) {
        socket.off('callResponse');
        socket.off('callSignal');
        socket.off('callEnded');
      }

      // Stop all tracks in the stream
      if (stream) {
        console.log('Stopping media streams');
        stream.getTracks().forEach(track => track.stop());
      }

      // Close peer connection
      if (connectionRef.current) {
        console.log('Destroying peer connection');
        connectionRef.current.destroy();
      }
    };
  }, [callId, socket, isInitiator, callStatus, stream, onEndCall]);

  // Handle accepting a call
  const acceptCall = async () => {
    try {
      console.log('Accepting call with ID:', callId, 'from recipient:', recipientId);
      setCallAccepted(true);
      setCallStatus('connected');

      // Notify caller that the call is accepted
      console.log('Sending call acceptance to server');
      
      // Try direct socket first, fallback to API
      const sentViaSocket = sendCallResponse(callId, recipientId, true);
      
      if (!sentViaSocket) {
        console.log('Sending call acceptance via API fallback');
        await axios.post('/api/conversations/call/response', {
          callId,
          callerId: recipientId, // For the recipient, the caller is the recipientId
          accepted: true
        });
      }

      // Start peer connection
      console.log('Starting peer connection as recipient');
      startPeer();
    } catch (err) {
      console.error('Error accepting call:', err);
      setError('Failed to accept call');
    }
  };

  // Handle declining a call
  const declineCall = async () => {
    try {
      setCallStatus('declined');
      
      // Notify caller that the call is declined
      // Try direct socket first, fallback to API
      const sentViaSocket = sendCallResponse(callId, recipientId, false);
      
      if (!sentViaSocket) {
        console.log('Sending call declination via API fallback');
        await axios.post('/api/conversations/call/response', {
          callId,
          callerId: recipientId,
          accepted: false
        });
      }

      // End call after a short delay
      setTimeout(() => {
        onEndCall();
      }, 1000);
    } catch (err) {
      console.error('Error declining call:', err);
      setError('Failed to decline call');
      onEndCall();
    }
  };

  // Initialize and start the peer connection
  const startPeer = () => {
    try {
      console.log('Initializing peer connection...');
      if (!stream) {
        console.error('No media stream available');
        setError('No media stream available');
        return;
      }

      console.log('Creating new Peer with initiator:', isInitiator);
      
      // Check if Peer constructor is available
      if (typeof WebRTCPeer !== 'function') {
        console.error('Peer constructor is not a function!', { WebRTCPeer });
        setError('WebRTC library not loaded correctly');
        return;
      }
      
      try {
        // Create the peer with ICE config for STUN/TURN servers
        const peerOptions = {
          initiator: isInitiator,
          trickle: false,
          stream,
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:global.stun.twilio.com:3478' }
            ]
          }
        };
        
        const peer = new WebRTCPeer(peerOptions);
        
        console.log('Peer object created successfully with options:', peerOptions);

        // When we receive a signal from our peer instance
        peer.on('signal', async (data) => {
          console.log('Local peer produced signal:', data);
          try {
            // Send the signal via socket first (more reliable for real-time)
            const sentViaSocket = sendCallSignal(callId, recipientId, data);
            
            // Fallback to API if socket fails
            if (!sentViaSocket) {
              console.log('Sending signal via API fallback');
              const response = await axios.post('/api/conversations/call/signal', {
                callId,
                recipientId,
                signal: data
              });
              console.log('Signal sent successfully, response:', response.data);
            }
          } catch (err) {
            console.error('Error sending signal:', err);
            if (err.response) {
              console.error('Server response:', err.response.data);
            }
            setError('Failed to establish connection');
          }
        });

        // When we receive a stream from the other user
        peer.on('stream', (remoteStream) => {
          console.log('Received remote stream');
          if (userVideo.current) {
            console.log('Setting remote video stream');
            userVideo.current.srcObject = remoteStream;
            
            // Try to play the video
            userVideo.current.play().catch(err => {
              console.error('Error playing remote video:', err);
            });
          } else {
            console.warn('userVideo ref is not ready');
          }
        });

        // Handle peer connection established
        peer.on('connect', () => {
          console.log('Peer connection established successfully!');
        });

        // Handle peer error
        peer.on('error', (err) => {
          console.error('Peer error:', err);
          setError('Connection error: ' + err.message);
          endCall();
        });

        // Handle peer close
        peer.on('close', () => {
          console.log('Peer connection closed');
          endCall();
        });

        connectionRef.current = peer;
        console.log('Peer connection initialized and stored in ref');
      } catch (peerError) {
        console.error('Error creating Peer instance:', peerError);
        setError('Failed to create WebRTC connection: ' + peerError.message);
      }
    } catch (err) {
      console.error('Error in startPeer function:', err);
      setError('Failed to start call: ' + err.message);
    }
  };

  // Handle ending the call
  const endCall = () => {
    console.log('Ending call with ID:', callId);
    setCallEnded(true);
    setCallStatus('ended');
    
    // Stop all tracks in the stream
    if (stream) {
      console.log('Stopping all media tracks');
      stream.getTracks().forEach(track => {
        console.log('Stopping track:', track.kind);
        track.stop();
      });
    }
    
    // Close peer connection
    if (connectionRef.current) {
      console.log('Destroying peer connection');
      connectionRef.current.destroy();
      connectionRef.current = null;
    }
    
    // Notify the other user that the call has ended
    if (socket) {
      console.log('Emitting endCall event');
      socketEndCall(callId, recipientId);
    }
    
    console.log('Calling onEndCall callback');
    onEndCall();
  };

  // Render call status UI based on current state
  const renderCallStatus = () => {
    switch (callStatus) {
      case 'calling':
        return (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 bg-opacity-75 z-10 text-white">
            <div className="animate-pulse text-2xl mb-4">Calling {recipientName}...</div>
            <button 
              onClick={endCall}
              className="mt-4 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-full"
            >
              End Call
            </button>
          </div>
        );
      
      case 'receiving':
        return (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 bg-opacity-75 z-10 text-white">
            <div className="text-2xl mb-4">Incoming call from {recipientName}</div>
            <div className="flex space-x-4 mt-4">
              <button 
                onClick={acceptCall}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-full"
              >
                Accept
              </button>
              <button 
                onClick={declineCall}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-full"
              >
                Decline
              </button>
            </div>
          </div>
        );
      
      case 'declined':
        return (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 bg-opacity-75 z-10 text-white">
            <div className="text-2xl mb-4">Call was declined</div>
          </div>
        );
      
      case 'ended':
        return (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 bg-opacity-75 z-10 text-white">
            <div className="text-2xl mb-4">Call ended</div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Show call status overlay */}
      {callStatus !== 'connected' && renderCallStatus()}
      
      {/* Error message */}
      {error && (
        <div className="absolute top-4 left-4 right-4 bg-red-600 text-white p-2 rounded">
          {error}
        </div>
      )}
      
      <div className="w-full h-full flex flex-col">
        {/* Remote user's video (large) */}
        <div className="relative flex-1">
          <video
            ref={userVideo}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        </div>
        
        {/* Local video (small overlay) */}
        <div className="absolute bottom-4 right-4 w-1/4 h-1/4 sm:w-1/5 sm:h-1/5 rounded-lg overflow-hidden border-2 border-white">
          <video
            ref={myVideo}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        </div>
        
        {/* Call controls */}
        <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-4">
          <button 
            onClick={endCall}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-full flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l-8 8m0-8l8 8m-8 0v-6a4 4 0 018 0v6" />
            </svg>
            <span className="ml-2">End Call</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoCall; 