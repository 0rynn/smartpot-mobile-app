// screens/SettingsScreen.js
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import PlantIcon from '../components/PlantIcon';

export default function SettingsScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <PlantIcon size={80} />
        <Text style={styles.title}>SmartPot</Text>
        <Text style={styles.version}>Version 1.0.0</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.sectionText}>
          SmartPot is an intelligent plant monitoring system that tracks
          temperature, light levels, and water levels to help keep your
          plants healthy.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Team</Text>
        <Text style={styles.sectionText}>Group 24</Text>
        <Text style={styles.sectionText}>Ryan Bamasi</Text>
        <Text style={styles.sectionText}>David Orozco</Text>
        <Text style={styles.sectionText}>Jason Moore</Text>
        <Text style={styles.sectionText}>Vlad Vulpe</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Institution</Text>
        <Text style={styles.sectionText}>
          University of Central Florida
        </Text>
        <Text style={styles.sectionText}>
          Electrical & Computer Engineering
        </Text>
        <Text style={styles.sectionText}>
          Senior Design 2025
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 30,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 15,
  },
  version: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 15,
    marginHorizontal: 15,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 10,
  },
  sectionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
});