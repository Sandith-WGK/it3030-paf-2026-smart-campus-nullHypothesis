package com.smartcampus.exception;

public class CommentNotFoundException extends RuntimeException {
    public CommentNotFoundException(String id) {
        super("Comment not found with id: " + id);
    }
}
