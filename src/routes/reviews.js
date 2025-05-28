const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const Book = require('../models/Book');
const auth = require('../middleware/auth');

/**
 * @swagger
 * components:
 *   schemas:
 *     Review:
 *       type: object
 *       required:
 *         - rating
 *         - comment
 *       properties:
 *         rating:
 *           type: number
 *           minimum: 1
 *           maximum: 5
 *         comment:
 *           type: string
 *         book:
 *           type: string
 *         user:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /books/{id}/reviews:
 *   post:
 *     summary: Add a review for a book
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *               - comment
 *             properties:
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *     responses:
 *       201:
 *         description: Review added successfully
 *       400:
 *         description: Already reviewed or invalid input
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Book not found
 */
router.post('/books/:id/reviews', auth, async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Check if user already reviewed this book
    const existingReview = await Review.findOne({
      book: req.params.id,
      user: req.user._id
    });

    if (existingReview) {
      return res.status(400).json({ error: 'You have already reviewed this book' });
    }

    const review = new Review({
      ...req.body,
      book: req.params.id,
      user: req.user._id
    });

    await review.save();

    // Update book's average rating
    const reviews = await Review.find({ book: req.params.id });
    const avgRating = reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length;
    book.averageRating = avgRating;
    book.reviewCount = reviews.length;
    await book.save();

    res.status(201).json(review);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /reviews/{id}:
 *   put:
 *     summary: Update a review
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *     responses:
 *       200:
 *         description: Review updated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Review not found or unauthorized
 */
router.put('/:id', auth, async (req, res) => {
  try {
    const review = await Review.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!review) {
      return res.status(404).json({ error: 'Review not found or unauthorized' });
    }

    Object.assign(review, req.body);
    await review.save();

    // Update book's average rating
    const book = await Book.findById(review.book);
    const reviews = await Review.find({ book: review.book });
    const avgRating = reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length;
    book.averageRating = avgRating;
    await book.save();

    res.json(review);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /reviews/{id}:
 *   delete:
 *     summary: Delete a review
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Review deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Review not found or unauthorized
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const review = await Review.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!review) {
      return res.status(404).json({ error: 'Review not found or unauthorized' });
    }

    // Update book's average rating
    const book = await Book.findById(review.book);
    const reviews = await Review.find({ book: review.book });
    const avgRating = reviews.length ? reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length : 0;
    book.averageRating = avgRating;
    book.reviewCount = reviews.length;
    await book.save();

    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;