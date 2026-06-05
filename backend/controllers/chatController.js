const chatService = require('../services/chatService');
const { successResponse, errorResponse } = require('../utils/response');

const createMessage = async (req, res) => {
  try {
    if (!req.internalUserId) return errorResponse(res, 'User profile not found', 404);
    const { room_id, message } = req.body;
    
    if (!room_id || !message) {
      return errorResponse(res, 'Missing room_id or message', 400);
    }

    const newMessage = await chatService.createMessage(room_id, req.internalUserId, message);
    return successResponse(res, newMessage, 201);
  } catch (error) {
    if (error.message === 'RATE_LIMIT') {
      return errorResponse(res, 'Sending messages too fast. Please wait a moment.', 429);
    }
    if (error.message === 'NOT_FOUND') {
      return errorResponse(res, 'Chat room not found', 404);
    }
    if (error.message === 'FORBIDDEN') {
      return errorResponse(res, 'Unauthorized to post in this room', 403);
    }
    console.error(error);
    return errorResponse(res, 'Internal Server Error');
  }
};

module.exports = {
  createMessage,
};
