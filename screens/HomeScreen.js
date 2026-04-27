// screens/HomeScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { database } from '../firebaseConfig';
import { ref, onValue } from 'firebase/database';
import SensorCard from '../components/SensorCard';
import PlantIcon from '../components/PlantIcon';

export default function HomeScreen() {
  const [sensorData, setSensorData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = () => {
    const latestRef = ref(database, 'smartpot/latest');
    
    onValue(latestRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setSensorData(data);
        setLastUpdate(new Date().toLocaleTimeString());
      }
      setLoading(false);
      setRefreshing(false);
    });
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const getWaterStatus = (percent) => {
    if (percent < 10) return { status: 'Empty', color: '#f44336' };
    if (percent < 30) return { status: 'Low', color: '#ff9800' };
    if (percent < 70) return { status: 'Medium', color: '#ffc107' };
    return { status: 'Good', color: '#4CAF50' };
  };

  const getLightStatus = (lux) => {
    if (lux < 100) return { status: 'Too Dark', color: '#f44336' };
    if (lux < 500) return { status: 'Low Light', color: '#ff9800' };
    if (lux < 1000) return { status: 'Moderate', color: '#ffc107' };
    if (lux < 5000) return { status: 'Bright', color: '#4CAF50' };
    return { status: 'Very Bright', color: '#00bcd4' };
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading SmartPot data...</Text>
      </View>
    );
  }

  if (!sensorData) {
    return (
      <View style={styles.loadingContainer}>
        <PlantIcon size={100} />
        <Text style={styles.noDataText}>No sensor data available</Text>
        <Text style={styles.noDataSubtext}>
          Make sure your ESP32 is connected and sending data
        </Text>
      </View>
    );
  }

  const waterInfo = getWaterStatus(sensorData.soil_moisture || 0);
  const lightInfo = getLightStatus(sensorData.light_lux || 0);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <PlantIcon size={80} />
        <Text style={styles.title}>SmartPot</Text>
        <Text style={styles.subtitle}>Plant Monitoring System</Text>
        {lastUpdate && (
          <Text style={styles.lastUpdate}>Last update: {lastUpdate}</Text>
        )}
      </View>

      {/* Sensor Cards */}
      <View style={styles.cardsContainer}>
        
        {/* Temperature Card */}
        <SensorCard
          title="Temperature"
          value={sensorData.temperature ? `${sensorData.temperature.toFixed(1)}°C` : 'N/A'}
          subtitle={sensorData.temperature ? `${(sensorData.temperature * 9/5 + 32).toFixed(1)}°F` : ''}
          icon="thermometer"
          color="#e91e63"
        />

        {/* Light Card */}
        <SensorCard
          title="Light Level"
          value={sensorData.light_lux ? `${Math.round(sensorData.light_lux)} lux` : 'N/A'}
          subtitle={lightInfo.status}
          icon="sunny"
          color={lightInfo.color}
        />

        {/* Water Level Card */}
        <SensorCard
          title="Water Level"
          value={sensorData.soil_moisture ? `${Math.round(sensorData.soil_moisture)}%` : 'N/A'}
          subtitle={waterInfo.status}
          icon="water"
          color={waterInfo.color}
        />

        {/* Pump Status Card */}
        <SensorCard
          title="Pump Status"
          value={sensorData.pump_status || 'OFF'}
          subtitle={sensorData.pump_status === 'ON' ? 'Watering...' : 'Standby'}
          icon="git-commit-outline"
          color={sensorData.pump_status === 'ON' ? '#2196F3' : '#9e9e9e'}
        />
      </View>

      {/* Footer Info */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Group 24 - Senior Design Project
        </Text>
        <Text style={styles.footerSubtext}>
          UCF Electrical & Computer Engineering
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  noDataText: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
  },
  noDataSubtext: {
    marginTop: 10,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  lastUpdate: {
    fontSize: 12,
    color: '#999',
    marginTop: 10,
  },
  cardsContainer: {
    padding: 15,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    fontWeight: 'bold',
  },
  footerSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
});