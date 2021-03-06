var async = require('async');
var Author = require('../models/author');
var Book = require('../models/book');
const { body,validationResult } = require('express-validator');

//display list of authors
exports.author_list = function(req, res, next) {
    
    Author.find()
    .sort([['family_name', 'ascending']])
    .exec(function (err, list_authors) {
        if (err) { return next(err); }
        //Success, then render
        res.render('author_list', { title: 'Author List', author_list: list_authors });
    });
};

//display detail for a specific author
exports.author_detail = function(req, res, next) {
    
    async.parallel({
        author: function(callback) {
            Author.findById(req.params.id)
                .exec(callback)
        },
        author_books: function(callback) {
            Book.find({ 'author': req.params.id }, 'title summary')
                .exec(callback)
        },
    }, function(err, results) {
        if (err) { return next(err); } //Error in API usage.
        if (results.author==null) { //No reults
            var err = new Error('Author not found.');
            err.status = 404;
            return next(err);
        }
        //Success, then render
        res.render('author_detail', { title: 'Author Detail', author: results.author, author_books: results.author_books });
    });
};

//Display Author create form on GET.
exports.author_create_get = function(req, res) {
    res.render('author_form', { title: 'Create Author' });
};

//Handle Author create on POST.
exports.author_create_post = [

    //Validate and sanitize fields
    body('first_name').trim().isLength({ min: 1 }).escape().withMessage('First name must be specified.')
        .isAlphanumeric().withMessage('First name has non-alphanumeric characters'),
    body('family_name').trim().isLength({ min: 1 }).escape().withMessage('Family name must be specified.')
        .isAlphanumeric().withMessage('Family name has non-alphanumeric characters.'),
    body('date_of_birth', 'Invalid date of birth').optional({ checkFalsy: true }).isISO8601().toDate(),
    body('date_of_death', 'Invalid date of death').optional({ checkFalsy: true }).isISO8601().toDate(),

    //Process request after validation and sanitization
    (req, res, next) => {

        //Extract the validation errors
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            //There are errors, rerender form with sanitized values and errors
            res.render('author_form', { title: 'Create Author', author: req.body, errors: errors.array() });
            return;
        }
        else {
            //Data form is valid:

            //Create an Author object with escaped and trimmed data
            var author = new Author(
                {
                    first_name: req.body.first_name,
                    family_name: req.body.family_name,
                    date_of_birth: req.body.date_of_birth,
                    date_of_death: req.body.date_of_death
                });
            author.save(function (err) {
                if (err) { return next(err); }
                //Succesful - redirect to new author record.
                res.redirect(author.url);
            });
        }
    }
];

//Display Author delete form on GET
exports.author_delete_get = function(req, res, next) {
    async.parallel({
        author: function(callback) {
            Author.findById(req.params.id).exec(callback)
        },
        authors_books: function(callback) {
            Book.find({ 'author': req.params.id }).exec(callback)
        },
    }, function(err, results) {
        if (err) { return next(err); }
        if (results.author==null) {
            res.redirect('/catalog/authors');
        }
        //Success, then render
        res.render('author_delete', { title: 'Delete Author', author: results.author, author_books: results.authors_books });
    });
};

//Handle Author delete on POST
exports.author_delete_post = function(req, res, next) {
    async.parallel({
        author: function(callback) {
            Author.findById(req.body.authorid).exec(callback)
        },
        authors_books: function(callback) {
            Book.find({ 'author': req.body.authorid }).exec(callback)
        },
    }, function(err, results) {
        if (err) { return next(err); }
        //Success
        if (results.authors_books.length > 0) {
            //Author has books.  Render in same way as for GET route.
            res.render('author_delete', { title: 'Delete Author', author: results.author, author_books: results.authors_books });
            return;
        }
        else {
            //Author has no books.  Delete object and redirect to the list of authors
            Author.findByIdAndRemove(req.body.authorid, function deleteAuthor(err) {
                if (err) { return next(err); }
                //Success, go to author list
                res.redirect('/catalog/authors')
            })
        }
    });
};

//Display Author update from GET.
exports.author_update_get = function (req, res, next) {

  Author.findById(req.params.id, function (err, results) {
      if (err) { return next(err); }
      if (results == null) { // No results.
          var err = new Error('Author not found');
          err.status = 404;
          return next(err);
      }
      // Success.
      res.render('author_form', { title: 'Update Author', author: results });

  });
};

//Handle Author update on POST
exports.author_update_post = 
[

  //Validate and sanitize fields
  body('first_name', 'First name must not be empty').trim().isLength({ min: 1 }).escape(),
  body('family_name', 'Family name must not be empty.').trim().isLength({ min: 1 }).escape(),
  body('date_of_birth', '').optional({ checkFalsy: true }).isISO8601().toDate(),
  body('date_of_death', '').optional({ checkFalsy: true }).isISO8601().toDate(),

  //Process request after validation and sanitization
  (req, res, next) => {

    //Extract the validation errors from a request
    const errors = validationResult(req);

    //Create an Author object with trimmed data and old id
    var author = new Author(
      {
        first_name: req.body.first_name,
        family_name: req.body.family_name,
        date_of_birth: req.body.date_of_birth,
        date_of_death: req.body.date_of_death,
        _id: req.params.id //This is required or a new ID will be assigned.
      });
    if (!errors.isEmpty()) {
      //There are errors, render for again with sanitized values/error messages

      //Get all authors form
      async.parallel({
        author: function(callback) {
          Author.find(callback);
        },
      }, function(err, results) {
        if (err) { return next(err); }

        res.render('author_form', { title: 'Update Author', author: results.author, errors: errors.array() });
      });
      return;
    }
    else {
      //Data from form is valid, update the record
      Author.findByIdAndUpdate(req.params.id, author, function (err, newAuthor) {
        if (err) { return next(err); }
        //Success, redirect to author detail page
        res.redirect(newAuthor.url);
      });
    }
  }
];