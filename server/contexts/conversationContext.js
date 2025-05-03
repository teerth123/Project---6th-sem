const setupConversationContext = (socket, io) => {
  // File sharing event
  socket.on("shareFile", (data) => {
    console.log("File shared:", data);
    io.to(data.conversationId).emit("newFile", data);
  });

  // Send message event (broadcast to conversation room)
  socket.on("sendMessage", (data) => {
    console.log(`Received message from ${socket.user.username} in conversation ${data.conversationId}`);
    io.to(data.conversationId).emit("newMessage", {
      conversationId: data.conversationId,
      text: data.text,
      fileUrl: data.fileUrl,
      type: data.type,
      sender: socket.user._id,
      senderName: socket.user.name,
      createdAt: new Date()
    });
  });

  // Typing status event
  socket.on("typing", (data) => {
    const { conversationId, isTyping } = data;
    io.to(conversationId).emit("userTyping", {
      userId: socket.user._id,
      username: socket.user.username,
      isTyping
    });
  });

  // Join conversation room event
  socket.on("joinConversation", (conversationId) => {
    if (conversationId) {
      socket.join(conversationId);
      console.log(`User ${socket.user.username} joined conversation ${conversationId}`);
    }
  });

  // Leave conversation room event
  socket.on("leaveConversation", (conversationId) => {
    if (conversationId) {
      socket.leave(conversationId);
      console.log(`User ${socket.user.username} left conversation ${conversationId}`);
    }
  });

  // Video call signaling event
  socket.on("callSignal", (data) => {
    const { recipientId, signal, callId } = data;
    if (!recipientId || !signal || !callId) {
      console.error("Invalid call signal data:", data);
      return socket.emit("error", { message: "Recipient ID, signal, and call ID are required." });
    }
    io.to(recipientId).emit("callSignal", {
      signal,
      callId,
      from: {
        _id: socket.user._id,
        name: socket.user.name,
        username: socket.user.username
      }
    });
  });

  // Call response event (accept/decline)
  socket.on("callResponse", (data) => {
    const { callId, callerId, accepted } = data;
    if (!callerId || !callId) {
      console.error("Invalid call response data:", data);
      return socket.emit("error", { message: "Caller ID and call ID are required." });
    }
    io.to(callerId).emit("callResponse", {
      callId,
      accepted,
      from: {
        _id: socket.user._id,
        name: socket.user.name,
        username: socket.user.username
      }
    });
  });

  // End call notification event
  socket.on("endCall", (data) => {
    const { callId, recipientId } = data;
    if (!callId || !recipientId) {
      return socket.emit("error", { message: "Call ID and recipient ID are required." });
    }
    io.to(recipientId).emit("callEnded", { callId, userId: socket.user._id });
    socket.emit("callEnded", { callId });
  });
};

export default setupConversationContext;