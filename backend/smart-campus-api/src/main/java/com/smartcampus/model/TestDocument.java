// model/TestDocument.java
package com.smartcampus.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document(collection = "test")
public class TestDocument {
    @Id
    private String id;
    private String message;
}