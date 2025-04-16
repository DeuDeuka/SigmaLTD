import React, { useState, useEffect } from 'react';
import { TouchableOpacity, Text } from 'react-native';
import Database from '../database';

export default function Tag({ tag, onRefresh }) {
    const [isFollowed, setIsFollowed] = useState(false);

    useEffect(() => {
        Database.getFollowedTags().then(tags => setIsFollowed(tags.includes(tag)));
    }, [tag]);

    const handleTagPress = async () => {
        try {
            if (isFollowed) {
                await Database.unfollowTag(tag);
            } else {
                await Database.followTag(tag);
            }
            setIsFollowed(!isFollowed);
            onRefresh(isFollowed);
        } catch (err) {
            console.error('Error toggling tag:', err);
        }
    };

    return (
        <TouchableOpacity onPress={handleTagPress} style={{
            marginRight: 5,
            backgroundColor: '#BBB',
            borderRadius: 10,
            padding: 5,
            alignContent: "center",
            height: "100%",
        }}>
            <Text style={{
                color: isFollowed ? '#fff' : '#888',
                fontWeight: isFollowed ? 'bold' : 'normal',
                textAlign: 'center',
                textAlignVertical: 'center',
                alignContent: 'center',
                alignSelf: 'center',
                alignItems: 'center',
            }}>
                {tag.substring(0, 20) || 'unknown'}
            </Text>
        </TouchableOpacity>
    );
}