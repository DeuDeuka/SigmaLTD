import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Switch, StyleSheet, Pressable, ScrollView, Animated, Easing, Alert } from 'react-native';
import Slider from '@react-native-community/slider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av'; // если используешь Expo

export default function LudoScreen() {
    const [betAmount, setBetAmount] = useState('0.00000000');
    const [target, setTarget] = useState(50.5);
    const [isOver, setIsOver] = useState(true);
    const [balance, setBalance] = useState(1.0);
    const [lastRoll, setLastRoll] = useState(null);

    // Auto betting config
    const [isAuto, setIsAuto] = useState(false);
    const [numBets, setNumBets] = useState('0');
    const [winIncrease, setWinIncrease] = useState('0');
    const [lossIncrease, setLossIncrease] = useState('0');
    const [stopProfit, setStopProfit] = useState('0.00000000');
    const [stopLoss, setStopLoss] = useState('0.00000000');

    const winChance = isOver ? (100 - target) : target;
    const multiplier = +(99 / winChance).toFixed(4);
    const profit = +(parseFloat(betAmount || '0') * (multiplier - 1)).toFixed(8);

    const [diceAnim] = useState(new Animated.Value(0));
    const [sound, setSound] = useState(null);

    useEffect(() => {
      const loadBalance = async () => {
        const saved = await AsyncStorage.getItem('balance');
        if (saved) setBalance(parseFloat(saved));
      };
      loadBalance();
    }, []);

    useEffect(() => {
      AsyncStorage.setItem('balance', balance.toString());
    }, [balance]);

    useEffect(() => {
      return sound
        ? () => {
            sound.unloadAsync();
          }
        : undefined;
    }, [sound]);

    const playSound = async (type) => {

    };

    const animateDice = () => {
      diceAnim.setValue(0);
      Animated.timing(diceAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.bounce,
        useNativeDriver: true,
      }).start();
    };

    const handleBet = () => {
        const bet = parseFloat(betAmount);
        if (isNaN(bet) || bet <= 0 || bet > balance) {
          Alert.alert('Invalid Bet');
          return;
        }
        const roll = +(Math.random() * 100).toFixed(2);
        setLastRoll(roll);
        animateDice();
        const win = isOver ? roll > target : roll < target;
        if (win) {
          const gain = bet * multiplier;
          setBalance(prev => +(prev + gain - bet).toFixed(8));
          playSound('win');
        } else {
          setBalance(prev => +(prev - bet).toFixed(8));
          playSound('lose');
        }
    };

    const startAutoBet = () => {
        let bet = parseFloat(betAmount);
        let currentBalance = balance;
        let wins = 0;
        let losses = 0;
        const maxBets = parseInt(numBets) || 9999;
        const stopP = parseFloat(stopProfit);
        const stopL = parseFloat(stopLoss);

        for (let i = 0; i < maxBets; i++) {
            if (bet > currentBalance) break;
            const roll = +(Math.random() * 100).toFixed(2);
            const win = isOver ? roll > target : roll < target;
            if (win) {
                const gain = bet * multiplier;
                currentBalance += gain - bet;
                wins++;
                bet *= 1 + parseFloat(winIncrease) / 100;
                if (stopP > 0 && currentBalance - balance >= stopP) break;
            } else {
                currentBalance -= bet;
                losses++;
                bet *= 1 + parseFloat(lossIncrease) / 100;
                if (stopL > 0 && balance - currentBalance >= stopL) break;
            }
        }
        setBalance(+currentBalance.toFixed(8));
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.sidebar}>
                <View style={styles.modeToggle}>
                    <Pressable onPress={() => setIsAuto(false)}><Text style={!isAuto ? styles.modeSelected : styles.modeUnselected}>Manual</Text></Pressable>
                    <Pressable onPress={() => setIsAuto(true)}><Text style={isAuto ? styles.modeSelected : styles.modeUnselected}>Auto</Text></Pressable>
                </View>

                <Text style={styles.balance}>Balance: {balance.toFixed(8)} ₿</Text>

                <Text style={styles.label}>Bet Amount</Text>
                <View style={styles.inputRow}>
                    <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        value={betAmount}
                        onChangeText={setBetAmount}
                    />
                    <Text style={styles.crypto}>₿</Text>
                </View>

                {isAuto && (
                    <>
                        <Text style={styles.label}>Number of Bets</Text>
                        <TextInput
                            style={styles.inputRow}
                            keyboardType="numeric"
                            value={numBets}
                            onChangeText={setNumBets}
                        />

                        <Text style={styles.label}>On Win</Text>
                        <TextInput
                            style={styles.inputRow}
                            keyboardType="numeric"
                            value={winIncrease}
                            onChangeText={setWinIncrease}
                            placeholder="Increase by %"
                        />

                        <Text style={styles.label}>On Loss</Text>
                        <TextInput
                            style={styles.inputRow}
                            keyboardType="numeric"
                            value={lossIncrease}
                            onChangeText={setLossIncrease}
                            placeholder="Increase by %"
                        />

                        <Text style={styles.label}>Stop on Profit</Text>
                        <View style={styles.inputRow}>
                            <TextInput
                                style={styles.input}
                                keyboardType="numeric"
                                value={stopProfit}
                                onChangeText={setStopProfit}
                            />
                            <Text style={styles.crypto}>₿</Text>
                        </View>

                        <Text style={styles.label}>Stop on Loss</Text>
                        <View style={styles.inputRow}>
                            <TextInput
                                style={styles.input}
                                keyboardType="numeric"
                                value={stopLoss}
                                onChangeText={setStopLoss}
                            />
                            <Text style={styles.crypto}>₿</Text>
                        </View>
                    </>
                )}

                <Pressable style={styles.betButton} onPress={isAuto ? startAutoBet : handleBet}>
                    <Text style={styles.betButtonText}>{isAuto ? 'Start Autobet' : 'Bet'}</Text>
                </Pressable>
            </View>

            <View style={styles.main}>
                <View style={styles.sliderLabelRow}>
                    <Text style={styles.sliderLabel}>0</Text>
                    <Text style={styles.sliderLabel}>25</Text>
                    <Text style={styles.sliderLabel}>50</Text>
                    <Text style={styles.sliderLabel}>75</Text>
                    <Text style={styles.sliderLabel}>100</Text>
                </View>

                <Slider
                    style={{ width: '100%' }}
                    minimumValue={1}
                    maximumValue={99}
                    step={0.01}
                    value={target}
                    onValueChange={setTarget}
                    minimumTrackTintColor="red"
                    maximumTrackTintColor="green"
                    thumbTintColor="skyblue"
                />

                <View style={styles.bottomInputs}>
                    <View style={styles.bottomInputBox}>
                        <Text style={styles.bottomLabel}>Multiplier</Text>
                        <TextInput style={styles.bottomInput} value={multiplier.toFixed(4)} editable={false} />
                    </View>
                    <View style={styles.bottomInputBox}>
                        <Text style={styles.bottomLabel}>Roll {isOver ? 'Over' : 'Under'}</Text>
                        <TextInput style={styles.bottomInput} value={target.toFixed(2)} editable={false} />
                    </View>
                    <View style={styles.bottomInputBox}>
                        <Text style={styles.bottomLabel}>Win Chance</Text>
                        <TextInput style={styles.bottomInput} value={winChance.toFixed(4)} editable={false} />
                    </View>
                </View>

                {lastRoll !== null && (
                    <Text style={styles.resultText}>🎲 Last Roll: {lastRoll}</Text>
                )}
                {lastRoll !== null && (
                  <Animated.View
                    style={{
                      marginTop: 20,
                      alignItems: 'center',
                      transform: [
                        {
                          rotate: diceAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0deg', '1080deg'],
                          }),
                        },
                      ],
                    }}
                  >
                    <Text style={{ fontSize: 40 }}>🎲</Text>
                  </Animated.View>
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0e1b2a',
        padding: 20,
    },
    sidebar: {
        padding: 20,
        backgroundColor: '#192734',
        borderRadius: 10,
        marginBottom: 20,
    },
    modeToggle: {
        flexDirection: 'row',
        marginBottom: 20,
        justifyContent: 'space-between',
    },
    modeSelected: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    modeUnselected: {
        color: '#aaa',
        fontSize: 16,
    },
    balance: {
        color: '#0f0',
        fontSize: 16,
        marginBottom: 10,
    },
    label: {
        color: '#aaa',
        marginTop: 10,
        marginBottom: 5,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2e3d51',
        borderRadius: 6,
        padding: 10,
        marginBottom: 5,
    },
    input: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
    },
    crypto: {
        color: '#f90',
        marginLeft: 5,
    },
    betButton: {
        marginTop: 20,
        backgroundColor: '#00ff00',
        padding: 15,
        borderRadius: 6,
        alignItems: 'center',
    },
    betButtonText: {
        fontWeight: 'bold',
        fontSize: 16,
    },
    main: {
        padding: 20,
        backgroundColor: '#121f2e',
        borderRadius: 10,
    },
    sliderLabelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    sliderLabel: {
        color: '#aaa',
        fontSize: 12,
    },
    bottomInputs: {
        marginTop: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    bottomInputBox: {
        flex: 1,
        marginHorizontal: 5,
    },
    bottomLabel: {
        color: '#aaa',
        marginBottom: 5,
        fontSize: 12,
    },
    bottomInput: {
        backgroundColor: '#2e3d51',
        color: '#fff',
        padding: 10,
        borderRadius: 6,
        fontSize: 14,
        textAlign: 'center',
    },
    resultText: {
        marginTop: 20,
        fontSize: 16,
        color: '#fff',
        textAlign: 'center',
    },
});