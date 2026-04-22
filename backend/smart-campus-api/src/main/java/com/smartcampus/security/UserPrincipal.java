package com.smartcampus.security;

import com.smartcampus.model.User;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.core.user.OAuth2User;

import java.util.Collection;
import java.util.Collections;
import java.util.Map;

public class UserPrincipal implements OAuth2User, UserDetails {

    private String id;
    private String email;
    private String name;
    private String provider;
    private String picture;
    private String password;
    private Collection<? extends GrantedAuthority> authorities;
    private Map<String, Object> attributes;

    public UserPrincipal(String id, String email, String name, String provider, String picture, String password, Collection<? extends GrantedAuthority> authorities) {
        this.id = id;
        this.email = email;
        this.name = name;
        this.provider = provider;
        this.picture = picture;
        this.password = password;
        this.authorities = authorities;
    }

    public static UserPrincipal create(User user) {
        GrantedAuthority authority = new SimpleGrantedAuthority("ROLE_" + user.getRole().name());

        return new UserPrincipal(
                user.getId(),
                user.getEmail(),
                user.getName(),
                user.getProvider(),
                user.getPicture(),
                user.getPassword(),
                Collections.singletonList(authority)
        );
    }

    public static UserPrincipal create(User user, Map<String, Object> attributes) {
        UserPrincipal userPrincipal = UserPrincipal.create(user);
        userPrincipal.setAttributes(attributes);
        return userPrincipal;
    }

    public String getEmail() {
        return email;
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }

    @Override
    public Map<String, Object> getAttributes() {
        return attributes;
    }

    public void setAttributes(Map<String, Object> attributes) {
        this.attributes = attributes;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    public String getUserId() {
        return id;
    }

    public String getId() {
        return id;
    }

    public String getPicture() {
        return picture;
    }

    public String getProvider() {
        return provider;
    }

    public String getDisplayName() {
        return name;
    }

    @Override
    public String getName() {
        return id;
    }
}