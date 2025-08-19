import Friendship from '../models/Friendship.js';

// @desc    Send a friend request
// @route   POST /api/friends/request/:recipientId
export const sendFriendRequest = async (req, res) => {
    const { recipientId } = req.params;
    const requesterId = req.user.id;

    if (requesterId === recipientId) {
        return res.status(400).json({ message: "You cannot be friends with yourself." });
    }

    const existingFriendship = await Friendship.findOne({
        $or: [
            { requester: requesterId, recipient: recipientId },
            { requester: recipientId, recipient: requesterId },
        ]
    });

    if (existingFriendship) {
        return res.status(400).json({ message: "A friendship request already exists or you are already friends." });
    }

    const newFriendship = new Friendship({ requester: requesterId, recipient: recipientId });
    await newFriendship.save();
    res.status(201).json({ message: "Friend request sent." });
};
export const getPendingRequests = async (req, res) => {
  try {
    const requests = await Friendship.find({
      recipient: req.user.id,
      status: 'pending',
    }).populate('requester', 'name'); // Populate with requester's name
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Respond to a friend request
// @route   PUT /api/friends/requests/:requestId
export const respondToRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action } = req.body; // 'accept' or 'decline'

    const request = await Friendship.findById(requestId);

    if (!request || request.recipient.toString() !== req.user.id) {
      return res.status(404).json({ message: 'Request not found or you are not the recipient.' });
    }

    if (action === 'accept') {
      request.status = 'accepted';
      await request.save();
      res.json({ message: 'Friend request accepted.' });
    } else if (action === 'decline') {
      await Friendship.findByIdAndDelete(requestId);
      res.json({ message: 'Friend request declined.' });
    } else {
      res.status(400).json({ message: 'Invalid action.' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};
export const getFriendships = async (req, res) => {
  try {
    const friendships = await Friendship.find({
      $or: [{ requester: req.user.id }, { recipient: req.user.id }],
    });
    res.json(friendships);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};