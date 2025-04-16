import {
    View,
    Text,
    TextInput,
    Button,
    Image,
    FlatList,
    TouchableOpacity,
    ScrollView,
    KeyboardAvoidingView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRef, useState } from 'react';
import Database from '../database';
import { Dimensions, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
    container: { flex: 1, padding: 10 },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
    input: { borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 5 },
    previewImage: { width: 100, height: 100, marginRight: 10, marginBottom: 10 },
    error: { color: 'red', marginBottom: 10 },
    postList: { marginTop: 10 },
    post: { marginBottom: 10 },
    postImage: {
        width: '100%',
        height: Dimensions.get('window').width * 0.9,
        borderRadius: 5,
    },
});

export function CreatePost( navigation: any ) {
    const [content, setContent] = useState('');
    const [posts, setPosts] = useState([]);
    const [media, setMedia] = useState([]);
    const [inputs, setInputs] = useState(['']); // Dynamic tags inputs
    const [error, setError] = useState('null');
    const [showReadMore, setShowReadMore] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const textInputRef = useRef(null);
    const [inputHeight, setInputHeight] = useState(0);
    const [contentHeight, setContentHeight] = useState(0);
    const scrollViewRef = useRef(null);
    const [isDisabled, setDisabled] = useState(false);

    const handleInputChange = (index:any, value:any) => {
        const newInputs = [...inputs];
        newInputs[index] = value;
        setInputs(newInputs);
    };

    const addInput = () => {
        if (inputs.length < 4) {
            setInputs([...inputs, '']);
        }
    };

    const handleReadMore = () => {
        setIsExpanded(true);
        setShowReadMore(false);
        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
    };

    const handleReadLess = () => {
        setIsExpanded(false);
        setShowReadMore(contentHeight > inputHeight);
    };

    const handleKeyDown = (e: any) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
        }
    };

    const pickMedia = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.All,
            allowsMultipleSelection: true,
            quality: 0.7,
            allowsEditing: true,
        });

        if (!result.canceled) {
            const newMedia = result.assets.map((asset) => ({
                uri: asset.uri,
                type: asset.type === 'video' ? 'video' : 'image',
                mimeType: asset.mimeType || (asset.type === 'image' ? 'image/jpeg' : 'video/mp4'),
            }));
            setMedia([...media, ...newMedia]);
        }
    };

    const submitPost = async (isAnonymous = false) => {
        setDisabled(true);
        if (!content.trim() && media.length === 0) {
            setError('Content or media is required');
            return;
        }

        try {
            // Use the dynamic inputs array instead of the old tags string
            const tagArray = inputs
                .filter(tag => tag.trim()) // Remove empty tags
                .map(tag => tag.trim());

            const mediaWithBase64 = await Promise.all(
                media.map(async (item, index) => {
                    const response = await fetch(item.uri);
                    const blob = await response.blob();
                    const base64 = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result.split(',')[1]);
                        reader.readAsDataURL(blob);
                    });
                    const extension = item.mimeType?.split('/')[1] || 'jpg';
                    const fileName = `${item.type}-${Date.now()}-${index}.${extension}`;
                    return {
                        name: fileName,
                        type: item.mimeType || 'application/octet-stream',
                        base64: base64,
                    };
                })
            );

            const payload = {
                content: content.trim() || '',
                tags: tagArray.join(','), // Join tags with commas for the payload
                isAnonymous: isAnonymous,
                images: mediaWithBase64,
            };

            const newPost = await Database.addPost(payload);

            setPosts([newPost, ...posts]);
            setContent('');
            setMedia([]);
            setInputs(['']); // Reset to one empty input
            setError('null');
            navigation.navigate('Main');

            return newPost;
        } catch (err) {
            const errorMessage = err.message || 'Failed to submit post';
            setError(errorMessage);
            console.error('Error submitting post:', err);
        }
    };

    const uriToBlob = async (uri: any) => {
        const response = await fetch(uri);
        const blob = await response.blob();
        return blob;
    };

    return (
        <KeyboardAvoidingView
            behavior="padding"
            style={{ flex: 1 }}
            keyboardVerticalOffset={20}
        >
            <ScrollView
                ref={scrollViewRef}
                style={{ flex: 1, backgroundColor: 'black' }}
                contentContainerStyle={{
                    flexGrow: 1,
                    padding: 10,
                    paddingBottom: 100,
                }}
                keyboardShouldPersistTaps="handled"
                scrollEnabled={true}
            >
                <View>
                    <TextInput
                        ref={textInputRef}
                        style={[
                            styles.input,
                            {
                                borderColor: '#000',
                                color: '#fff',
                                height: isExpanded ? contentHeight : 80,
                                minHeight: 80,
                                borderRadius: 20,
                            },
                        ]}
                        placeholder="What's on your mind?"
                        value={content}
                        onChangeText={(NewText) => {
                            if (NewText.length <= 10000) {
                                setContent(NewText);
                            }
                        }}
                        onContentSizeChange={(e) => {
                            const newContentHeight = e.nativeEvent.contentSize.height;
                            setContentHeight(newContentHeight);
                            if (!isExpanded) {
                                setShowReadMore(newContentHeight > inputHeight);
                            }
                        }}
                        onLayout={(e) => {
                            if (!isExpanded) {
                                setInputHeight(e.nativeEvent.layout.height);
                            }
                        }}
                        placeholderTextColor={'#666'}
                        numberOfLines={3}
                        multiline={true}
                        scrollEnabled={true}
                    />
                    {showReadMore && !isExpanded && (
                        <TouchableOpacity
                            onPress={handleReadMore}
                            style={{
                                marginTop: 5,
                                padding: 5,
                                alignSelf: 'flex-start',
                            }}
                        >
                            <Text
                                style={{
                                    color: '#0066cc',
                                    fontSize: 14,
                                    fontWeight: '500',
                                }}
                            >
                                Read More
                            </Text>
                        </TouchableOpacity>
                    )}
                    {isExpanded && (
                        <TouchableOpacity
                            onPress={handleReadLess}
                            style={{
                                marginTop: 5,
                                padding: 5,
                                alignSelf: 'flex-start',
                            }}
                        >
                            <Text
                                style={{
                                    color: '#0066cc',
                                    fontSize: 14,
                                    fontWeight: '500',
                                }}
                            >
                                Read Less
                            </Text>
                        </TouchableOpacity>
                    )}
                    {/* Dynamic Tags Inputs */}
                    {inputs.map((input, index) => (
                        <View
                            key={index}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                marginBottom: 10,
                            }}
                        >
                            <TextInput
                                style={[
                                    styles.input,
                                    {
                                        borderColor: '#000',
                                        color: '#fff',
                                        flex: 1,
                                    },
                                ]}
                                placeholder={`Tag ${index + 1}`}
                                value={input}
                                onChangeText={(value) => handleInputChange(index, value)}
                                placeholderTextColor={'#666'}
                            />
                            {index === inputs.length - 1 && inputs.length < 4 && (
                                <TouchableOpacity
                                    onPress={addInput}
                                    style={{
                                        marginLeft: 10,
                                        backgroundColor: '#4CAF50',
                                        padding: 10,
                                        borderRadius: 5,
                                    }}
                                >
                                    <Text style={{ color: 'white', fontSize: 16 }}>+</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    ))}
                    {media.length > 0 && (
                        <FlatList
                            data={media}
                            renderItem={({ item }) => (
                                <Image source={{ uri: item.uri }} style={styles.previewImage} />
                            )}
                            keyExtractor={(item, index) => index.toString()}
                            horizontal
                            pagingEnabled
                        />
                    )}
                    <Button title="Pick Media" onPress={pickMedia} />
                    <Button title="Post" disabled={isDisabled} onPress={() => submitPost(false)} />
                    <Button title="Anon Post" disabled={isDisabled} onPress={() => submitPost(true)} />
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}