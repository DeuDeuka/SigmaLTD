// screens/ProfileSettingsScreen.js

import React, {useEffect, useState} from 'react';
import {View, Text, ActivityIndicator, Dimensions, TouchableOpacity, Image} from 'react-native';
import {styles} from '../styles/screens/ProfileScreen';
import {Menu} from "../MainNavigator";
import Database, {API_URL} from "../database";
import SuperScrollList from "../components/SuperScrollList";
import {Avatar} from "@rneui/base";

export default function ProfileScreen({navigation, route}) {
    const { current, colors } =  {
        current: 'light',
        colors: { light: { text: '#FFF', background: '#000' } },
    };
    const theme = colors[current];
    
    const [user, setUser] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isOwnProfile, setIsOwnProfile] = useState(false);
    const [userStats, setUserStats] = useState(null);
    
    // Получаем userId из route.params или используем текущего пользователя
    const userId = route?.params?.userId;

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                setIsLoading(true);
                console.log('ProfileScreen: Starting to fetch user data, userId:', userId);
                
                // Получаем текущего пользователя
                const currentUserData = await Database.getCurrentUser();
                console.log('ProfileScreen: Current user data:', currentUserData);
                setCurrentUser(currentUserData);
                
                // Определяем, чей профиль показывать
                const targetUserId = userId || currentUserData?.idUser;
                console.log('ProfileScreen: Target user ID:', targetUserId);
                
                if (targetUserId) {
                    // Получаем данные пользователя
                    const userData = await Database.getUser(targetUserId);
                    console.log('ProfileScreen: User data:', userData);
                    setUser(userData);
                    
                    // Проверяем, является ли это профилем текущего пользователя
                    const isOwn = currentUserData?.idUser === targetUserId;
                    console.log('ProfileScreen: Is own profile:', isOwn);
                    setIsOwnProfile(isOwn);
                    
                    // Загружаем статистику пользователя
                    await fetchUserStats();
                }
            } catch (error) {
                console.error('Error fetching user data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserData();
    }, [userId]);

    // Функция для загрузки постов пользователя
    const getUserPosts = async (page) => {
        try {
            const targetUserId = userId || currentUser?.idUser;
            console.log('Fetching posts for user:', targetUserId, 'page:', page);
            console.log('Current user:', currentUser);
            console.log('Route userId:', userId);
            
            if (!targetUserId) {
                console.log('No target user ID found');
                return { posts: [] };
            }
            
            const response = await fetch(`${API_URL}/user/${targetUserId}/posts?page=${page}&pageSize=10`, {
                headers: await Database.authHeaders(),
            });
            
            console.log('Response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error:', errorText);
                throw new Error(errorText);
            }
            
            const data = await response.json();
            console.log('Received posts data:', data);
            return data;
        } catch (error) {
            console.error('Error fetching user posts:', error);
            return { posts: [] };
        }
    };

    // Функция для загрузки статистики пользователя
    const fetchUserStats = async () => {
        try {
            const targetUserId = userId || currentUser?.idUser;
            if (!targetUserId) return;

            const response = await fetch(`${API_URL}/user/${targetUserId}/stats`, {
                headers: await Database.authHeaders(),
            });

            if (response.ok) {
                const statsData = await response.json();
                setUserStats(statsData);
            }
        } catch (error) {
            console.error('Error fetching user stats:', error);
        }
    };

    if (isLoading) {
        return (
            <View style={[styles.container, {backgroundColor: theme.background}]}>
                <Menu navigation={navigation} header={true}/>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.text} />
                    <Text style={[styles.loadingText, {color: theme.text}]}>Loading profile...</Text>
                </View>
            </View>
        );
    }

    if (!user) {
        return (
            <View style={[styles.container, {backgroundColor: theme.background}]}>
                <Menu navigation={navigation} header={true}/>
                <View style={styles.errorContainer}>
                    <Text style={[styles.errorText, {color: theme.text}]}>User not found</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, {backgroundColor: theme.background}]}>
            <Menu navigation={navigation} header={true}/>
            
            {/* Profile Header */}
            <View style={styles.profileHeader}>
                <View style={styles.profileInfo}>
                    <Avatar
                        source={user.pic ? {uri: user.pic} : require('../assets/default-avatar.png')}
                        rounded
                        size="large"
                        containerStyle={styles.avatar}
                    />
                    <View style={styles.userDetails}>
                        <Text style={[styles.username, {color: theme.text}]}>
                            {user.displayedName || 'Unknown User'}
                        </Text>
                        <Text style={[styles.userId, {color: theme.text}]}>
                            ID: {user.idUser}
                        </Text>
                        {isOwnProfile && (
                            <Text style={[styles.ownProfile, {color: '#4CAF50'}]}>
                                Your Profile
                            </Text>
                        )}
                    </View>
                </View>
                
                {isOwnProfile && (
                    <TouchableOpacity 
                        style={styles.settingsButton}
                        onPress={() => navigation.navigate('ProfileSettings')}
                    >
                        <Text style={styles.settingsButtonText}>Settings</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* User Stats */}
            {userStats && (
                <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                        <Text style={[styles.statNumber, {color: theme.text}]}>
                            {userStats.postsCount || 0}
                        </Text>
                        <Text style={[styles.statLabel, {color: '#888'}]}>Posts</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={[styles.statNumber, {color: theme.text}]}>
                            {userStats.commentsCount || 0}
                        </Text>
                        <Text style={[styles.statLabel, {color: '#888'}]}>Comments</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={[styles.statNumber, {color: theme.text}]}>
                            {userStats.followersCount || 0}
                        </Text>
                        <Text style={[styles.statLabel, {color: '#888'}]}>Tag Followers</Text>
                    </View>
                </View>
            )}

            {/* Posts Section */}
            <View style={styles.postsSection}>
                <Text style={[styles.sectionTitle, {color: theme.text}]}>
                    {isOwnProfile ? 'Your Posts' : `${user.displayedName}'s Posts`}
                </Text>
                {currentUser && (
                    <SuperScrollList 
                        navigation={navigation} 
                        loader={getUserPosts}
                    />
                )}
            </View>
        </View>
    );
}
