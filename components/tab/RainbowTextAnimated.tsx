import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Animated, Easing, Platform, Text } from 'react-native';

export default function RainbowTextAnimated({ children, style }: { children: string; style?: any }) {
  const t = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    let mounted = true;
    const loop = () => {
      if (!mounted) return;
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration: 3500, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(t, { toValue: 0, duration: 3500, easing: Easing.linear, useNativeDriver: true }),
      ]).start(() => loop());
    };
    loop();
    return () => { mounted = false; };
  }, [t]);

  const translate = t.interpolate({ inputRange: [0, 1], outputRange: [-200, 200] });

  if (Platform.OS === 'web') {
    return (
      <Text style={[style, { color: '#FACC15', textShadowColor: '#0003', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }]}>
        {children}
      </Text>
    );
  }

  return (
    <MaskedView maskElement={<Text style={[style, { backgroundColor: 'transparent' }]}>{children}</Text>}>
      <Animated.View style={{ transform: [{ translateX: translate }] }}>
        <LinearGradient
          colors={['#FF0000','#FF7F00','#FFFF00','#00FF00','#0000FF','#4B0082','#8B00FF','#FF0000']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={{ width: 600, height: 34 }}
        />
      </Animated.View>
    </MaskedView>
  );
}
