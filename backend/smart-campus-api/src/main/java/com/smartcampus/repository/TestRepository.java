// repository/TestRepository.java
package com.smartcampus.repository;

import com.smartcampus.model.TestDocument;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface TestRepository extends MongoRepository<TestDocument, String> {
}