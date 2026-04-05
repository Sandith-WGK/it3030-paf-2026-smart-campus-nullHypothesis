package com.smartcampus.security;

import com.smartcampus.user.Role;
import com.smartcampus.user.User;
import com.smartcampus.user.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    @Autowired
    private UserRepository userRepository;

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oAuth2User = super.loadUser(userRequest);

        String email = oAuth2User.getAttribute("email");
        String name = oAuth2User.getAttribute("name");
        String picture = oAuth2User.getAttribute("picture");

        Optional<User> userOptional = userRepository.findByEmail(email);
        User user;
        if (userOptional.isPresent()) {
            user = userOptional.get();
            // Update profile info on login
            user.setName(name);
            user.setAvatarUrl(picture);
            user = userRepository.save(user);
        } else {
            // Register new account natively mapping to User role
            user = User.builder()
                    .email(email)
                    .name(name)
                    .avatarUrl(picture)
                    .role(Role.USER) // By default, everyone is a USER
                    .build();
            user = userRepository.save(user);
        }

        return CustomOAuth2User.builder()
                .user(user)
                .attributes(oAuth2User.getAttributes())
                .build();
    }
}
