const express = require('express');
const router = express.Router();
const Meeting = require('../models/Meeting');
const auth = require('../middleware/authMiddleware');

// @route   POST api/meeting/create
// @desc    Create a new meeting room
// @access  Private
router.post('/create', auth, async (req, res) => {
    const { roomId } = req.body;

    try {
        const newMeeting = new Meeting({
            roomId,
            host: req.user.id,
        });

        const meeting = await newMeeting.save();
        res.json(meeting);
    } catch (err) {
        console.error(err.message);
        if (err.code === 11000) {
            return res.status(400).json({ msg: 'Meeting room ID already exists' });
        }
        res.status(500).send('Server Error');
    }
});

// @route   GET api/meeting/:roomId
// @desc    Check if meeting room exists
// @access  Private
router.get('/:roomId', auth, async (req, res) => {
    try {
        const meeting = await Meeting.findOne({ roomId: req.params.roomId });

        if (!meeting) {
            return res.status(404).json({ msg: 'Meeting room not found' });
        }

        res.json(meeting);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
