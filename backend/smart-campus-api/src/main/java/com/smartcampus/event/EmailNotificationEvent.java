package com.smartcampus.event;

import com.smartcampus.model.User;
import org.springframework.context.ApplicationEvent;

public class EmailNotificationEvent extends ApplicationEvent {

    private final User user;
    private final String subject;
    private final String messageText;

    public EmailNotificationEvent(Object source, User user, String subject, String messageText) {
        super(source);
        this.user = user;
        this.subject = subject;
        this.messageText = messageText;
    }

    public User getUser() {
        return user;
    }

    public String getSubject() {
        return subject;
    }

    public String getMessageText() {
        return messageText;
    }
}
