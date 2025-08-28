import Friendship from '../models/Friendship.js';

export const sendFriendRequest = async (req, res) => {
  try {
    const requester = req.user._id;
    const recipient = req.params.recipientId;

    const existing = await Friendship.findOne({
      $or: [
        { requester, recipient },
        { requester: recipient, recipient: requester }
      ]
    });
    if (existing) return res.status(400).json({ message: `Already ${existing.status}` });

    const fr = await Friendship.create({ requester, recipient, status: 'pending' });
    res.status(201).json(fr);
  } catch (e) {
    if (e.code === 11000) return res.status(400).json({ message: 'Request already exists' });
    res.status(500).json({ message: 'Server Error' });
  }
};

export const getPendingRequests = async (req, res) => {
  try {
    const me = req.user._id;
    const items = await Friendship.find({ recipient: me, status: 'pending' })
      .populate('requester', 'name avatar');
    res.json(items);
  } catch {
    res.status(500).json({ message: 'Server Error' });
  }
};

export const respondToRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action } = req.body; // 'accept'|'decline'
    const me = req.user._id;

    const fr = await Friendship.findById(requestId);
    if (!fr) return res.status(404).json({ message: 'Not found' });
    if (fr.recipient.toString() !== me.toString()) {
      return res.status(403).json({ message: 'Not your request' });
    }

    if (action === 'accept') fr.status = 'accepted';
    else if (action === 'decline') fr.status = 'declined';
    else return res.status(400).json({ message: 'Invalid action' });

    await fr.save();
    res.json(fr);
  } catch {
    res.status(500).json({ message: 'Server Error' });
  }
};

export const getFriendships = async (req, res) => {
  try {
    const me = req.user._id;
    const items = await Friendship.find({
      status: 'accepted',
      $or: [{ requester: me }, { recipient: me }]
    })
      .populate('requester', 'name avatar')
      .populate('recipient', 'name avatar');

    // Return "the other person" for convenience
    const friends = items.map(fr => {
      const other = fr.requester._id.toString() === me.toString() ? fr.recipient : fr.requester;
      return { _id: other._id, name: other.name, avatar: other.avatar };
    });

    res.json(friends);
  } catch {
    res.status(500).json({ message: 'Server Error' });
  }
};
export const getSentRequests = async (req, res) => {
  try {
    const me = req.user._id;
    const items = await Friendship.find({ requester: me, status: 'pending' })
      .populate('recipient', 'name avatar');

    res.json(items);
  } catch {
    res.status(500).json({ message: 'Server Error' });
  }
};
