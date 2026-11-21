package com.scouthub.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {

    @Query("select u from User u where lower(u.email) = lower(:email)")
    Optional<User> findByEmail(@Param("email") String email);

    @Query("select count(u) > 0 from User u where lower(u.email) = lower(:email)")
    boolean existsByEmail(@Param("email") String email);

    boolean existsByRole(Role role);

    /** Admin list: optional text search on email / name and optional role filter. */
    @Query("""
            select u from User u
            where (:role is null or u.role = :role)
              and (:q is null
                   or lower(u.email) like lower(concat('%', :q, '%'))
                   or lower(coalesce(u.fullName, '')) like lower(concat('%', :q, '%')))
            order by u.createdAt desc
            """)
    List<User> search(@Param("q") String query, @Param("role") Role role);
}
