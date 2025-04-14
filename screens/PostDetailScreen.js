import React, {useEffect, useState, useRef} from 'react';
import {
    View,
    TextInput,
    FlatList,
    Button,
    Text,
    Image,
    ActivityIndicator,
    Platform,
    StyleSheet,
    KeyboardAvoidingView,
    Switch,
    TouchableOpacity,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {useSelector} from 'react-redux';
import Database, {BASE_URL} from '../database';
import {Menu} from "../MainNavigator";
import Comment from "../components/Comment";

export default function PostDetailScreen({route}) {
    const {current, colors} = useSelector((state) => state.theme) || {
        current: 'light',
        colors: {light: {text: '#000', background: '#FFF'}},
    };
    const theme = colors[current] || {text: '#000', background: '#FFF'};

    const [post, setPost] = useState(null);
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newComment, setNewComment] = useState('');
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [selectedImages, setSelectedImages] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const flatListRef = useRef(null);

    useEffect(() => {
        const timeout = setTimeout(() => {
            flatListRef.current?.scrollToEnd({animated: true});
        }, 100);
        return () => clearTimeout(timeout);
    }, [comments]);

    useEffect(() => {
        const interval = setInterval(async () => {
            await updateComments();
        }, 1000)
        return () => clearInterval(interval)
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                console.log(route.params.postId);
                const postData = await Database.getPost(route.params.postId);
                const loadedComments = await Database.getPostComments(route.params.postId);
                const currentUse = await Database.getCurrentUser();
                console.log(currentUse);
                setPost(postData);
                setComments(loadedComments);
                setCurrentUser(currentUse);
            } catch (err) {
                console.error('❌ Ошибка загрузки:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [route.params.postId]);

    const updateComments = async () => {
        const loadedComments = await Database.getPostComments(route.params.postId);
        setComments(loadedComments);
    }

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.7,
            base64: true,
        });

        if (!result.canceled) {
            const asset = result.assets?.[0];
            if (!asset || !asset.base64) return;

            const fullDataUri = `data:image/jpeg;base64,${asset.base64}`;
            console.log('📸 Получили base64:', fullDataUri.slice(0, 100), '...');
            setSelectedImages([{uri: fullDataUri}]);
        }
    };

    const sendComment = async () => {
        const content = newComment.trim();
        if (!content && selectedImages.length === 0) return;

        try {
            const imageBase64 = selectedImages[0]?.uri || null;

            const newC = await Database.addCommentBase64({
                postId: post.idPost || post.id,
                content,
                isAnonymous: isAnonymous,
                imageBase64,
            });

            setComments((prev) => [...prev, newC]);
            setNewComment('');
            setSelectedImages([]);
        } catch (err) {
            console.error('❌ Ошибка отправки комментария:', err);
        }
    };

    const toggleLike = async (item) => {
        try {
            console.log(comments);
            const updatedComments = [...comments];
            const index = updatedComments.findIndex((c) => c.idComment === item.idComment);
            if (index === -1) return;

            const current = updatedComments[index];
            if (current.likedByMe) {
                await Database.unlikeComment(current.idComment);
                current.likes = Number(current.likes) - 1;
                current.likedByMe = false;
            } else {
                await Database.likeComment(current.idComment);
                current.likes = Number(current.likes) + 1;
                current.likedByMe = true;
            }

            setComments(updatedComments);
        } catch (err) {
            console.error('❌ Ошибка лайка:', err);
        }
    };

    const renderComment = ({item}) => {
        return <Comment comment={item} currentUser={currentUser} toggleLike={toggleLike}/>
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={theme.text}/>
            </View>
        );
    }

    const Wrapper = Platform.OS === 'web' ? View : KeyboardAvoidingView;

    return (
        <View style={styles.container}>
            <Menu navigation={route.params.navigation} header={true}/>
            <Wrapper style={{flex: 1}} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <FlatList
                    ref={flatListRef}
                    data={comments}
                    renderItem={renderComment}
                    keyExtractor={(item) => String(item.idComment)}
                    contentContainerStyle={styles.commentsContainer}
                />

                {selectedImages.length > 0 && (
                    <View style={{flexDirection: 'row', flexWrap: 'wrap', padding: 8}}>
                        {selectedImages.map((img, i) => (
                            <Image
                                key={i}
                                source={{uri: img.uri}}
                                style={{width: 80, height: 80, margin: 4, borderRadius: 8}}
                            />
                        ))}
                    </View>
                )}

                <View style={styles.inputContainer}>
                    <TextInput
                        value={newComment}
                        onChangeText={setNewComment}
                        style={styles.textInput}
                        placeholder="Ваш комментарий..."
                        placeholderTextColor="#888"
                    />
                    <Text>Анонимно?</Text>
                    <Switch
                        value={isAnonymous}
                        onValueChange={setIsAnonymous}
                        style={{marginHorizontal: 10}}
                    />
                    <Button title="Отправить" onPress={sendComment}/>
                </View>
            </Wrapper>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    commentsContainer: {
        padding: 12,
    },
    commentBubble: {
        marginBottom: 10,
        padding: 12,
        borderRadius: 12,
        maxWidth: '90%',
    },
    myComment: {
        alignSelf: 'flex-end',
        backgroundColor: '#d0f0c0',
    },
    otherComment: {
        alignSelf: 'flex-start',
        backgroundColor: '#e6e6e6',
    },
    author: {
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    commentText: {
        color: '#000',
        fontSize: 15,
        marginBottom: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 10,
        borderTopWidth: 1,
        borderColor: '#ccc',
        backgroundColor: '#f9f9f9',
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    textInput: {
        flex: 1,
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginRight: 10,
        fontSize: 15,
        backgroundColor: '#fff',
        color: '#000',
    },
});
