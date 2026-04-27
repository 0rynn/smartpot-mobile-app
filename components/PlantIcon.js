// components/PlantIcon.js
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function PlantIcon({ size = 60 }) {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Ionicons name="leaf" size={size * 0.6} color="#4CAF50" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    borderRadius: 100,
  },
});