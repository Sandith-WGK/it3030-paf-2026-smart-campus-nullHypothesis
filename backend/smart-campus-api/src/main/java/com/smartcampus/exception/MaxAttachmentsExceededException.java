package com.smartcampus.exception;

public class MaxAttachmentsExceededException extends RuntimeException {
    public MaxAttachmentsExceededException() {
        super("Cannot upload more than 3 attachments in total.");
    }
    
    public MaxAttachmentsExceededException(String message) {
        super(message);
    }
}
