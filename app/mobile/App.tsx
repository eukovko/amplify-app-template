import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, Pressable } from 'react-native';
import { useCounter, registerForPush } from 'app-shared';
import styles from './styles';

export default function App(): React.JSX.Element {
  const { count, increment, decrement, loading, error } = useCounter();
  const [pushStatus, setPushStatus] = useState<string | null>(null);

  useEffect(() => {
    registerForPush().then((result) => {
      setPushStatus(result.ok ? 'Push: registered' : `Push: ${result.error}`);
    });
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hello from mobile</Text>
      {pushStatus ? <Text style={styles.counterValue}>{pushStatus}</Text> : null}
      {error ? <Text style={styles.counterValue}>{error}</Text> : null}
      <View style={styles.counter}>
        <Pressable
          style={styles.counterBtn}
          onPress={decrement}
          disabled={loading}
        >
          <Text style={styles.counterBtnText}>−</Text>
        </Pressable>
        <Text style={styles.counterValue}>{loading ? '…' : count}</Text>
        <Pressable
          style={styles.counterBtn}
          onPress={increment}
          disabled={loading}
        >
          <Text style={styles.counterBtnText}>+</Text>
        </Pressable>
      </View>
      <StatusBar style="auto" />
    </View>
  );
}
