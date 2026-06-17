// screens/ChartsScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { database } from '../firebaseConfig';
import { ref, onValue, query, limitToLast } from 'firebase/database';

const screenWidth = Dimensions.get('window').width;

export default function ChartsScreen() {
  const [timeRange, setTimeRange] = useState('1day'); // '1day', '1week', '1month'
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistoricalData();
  }, [timeRange]);

  const fetchHistoricalData = () => {
    setLoading(true);
    
    // Determine how many data points to fetch based on time range
    const dataPoints = {
      '1day': 288,    // 5-second intervals for 24 hours
      '1week': 2016,  // 5-second intervals for 1 week
      '1month': 8640, // 5-second intervals for 30 days
    };
    
    const limit = dataPoints[timeRange];
    const historyRef = query(ref(database, 'smartpot/history'), limitToLast(limit));
    
    onValue(historyRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const dataArray = Object.values(data);
        setHistoryData(dataArray);
      }
      setLoading(false);
    });
  };

  const formatChartData = (dataKey) => {
    if (historyData.length === 0) return null;
    
    // Sample data points to fit on chart (max 20 points for readability)
    const sampleSize = Math.ceil(historyData.length / 20);
    const sampledData = historyData.filter((_, index) => index % sampleSize === 0);
    
    return {
      labels: sampledData.map((_, index) => ''), // Empty labels for cleaner look
      datasets: [
        {
          data: sampledData.map(item => item[dataKey] || 0),
          strokeWidth: 2,
        },
      ],
    };
  };

  const getStats = (dataKey) => {
    if (historyData.length === 0) return { min: 0, max: 0, avg: 0 };
    
    const values = historyData.map(item => item[dataKey] || 0);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    
    return { min, max, avg };
  };

  const chartConfig = {
    backgroundColor: '#fff',
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '3',
      strokeWidth: '2',
      stroke: '#4CAF50',
    },
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading historical data...</Text>
      </View>
    );
  }

  const tempData = formatChartData('temperature');
  const lightData = formatChartData('light_lux');
  const waterData = formatChartData('soil_moisture');

  const tempStats = getStats('temperature');
  const lightStats = getStats('light_lux');
  const waterStats = getStats('soil_moisture');

  return (
    <ScrollView style={styles.container}>
      {/* Time Range Selector */}
      <View style={styles.timeRangeContainer}>
        <TouchableOpacity
          style={[styles.timeButton, timeRange === '1day' && styles.timeButtonActive]}
          onPress={() => setTimeRange('1day')}
        >
          <Text style={[styles.timeButtonText, timeRange === '1day' && styles.timeButtonTextActive]}>
            1 Day
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.timeButton, timeRange === '1week' && styles.timeButtonActive]}
          onPress={() => setTimeRange('1week')}
        >
          <Text style={[styles.timeButtonText, timeRange === '1week' && styles.timeButtonTextActive]}>
            1 Week
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.timeButton, timeRange === '1month' && styles.timeButtonActive]}
          onPress={() => setTimeRange('1month')}
        >
          <Text style={[styles.timeButtonText, timeRange === '1month' && styles.timeButtonTextActive]}>
            1 Month
          </Text>
        </TouchableOpacity>
      </View>

      {/* Temperature Chart */}
      {tempData && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>🌡️ Temperature</Text>
          <LineChart
            data={tempData}
            width={screenWidth - 40}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
          />
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Min</Text>
              <Text style={styles.statValue}>{tempStats.min.toFixed(1)}°C</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Avg</Text>
              <Text style={styles.statValue}>{tempStats.avg.toFixed(1)}°C</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Max</Text>
              <Text style={styles.statValue}>{tempStats.max.toFixed(1)}°C</Text>
            </View>
          </View>
        </View>
      )}

      {/* Light Chart */}
      {lightData && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>☀️ Light Level</Text>
          <LineChart
            data={lightData}
            width={screenWidth - 40}
            height={220}
            chartConfig={{
              ...chartConfig,
              color: (opacity = 1) => `rgba(255, 193, 7, ${opacity})`,
              propsForDots: {
                r: '3',
                strokeWidth: '2',
                stroke: '#FFC107',
              },
            }}
            bezier
            style={styles.chart}
          />
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Min</Text>
              <Text style={styles.statValue}>{Math.round(lightStats.min)} lux</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Avg</Text>
              <Text style={styles.statValue}>{Math.round(lightStats.avg)} lux</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Max</Text>
              <Text style={styles.statValue}>{Math.round(lightStats.max)} lux</Text>
            </View>
          </View>
        </View>
      )}

      {/* Water Level Chart */}
      {waterData && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>💧 Water Level</Text>
          <LineChart
            data={waterData}
            width={screenWidth - 40}
            height={220}
            chartConfig={{
              ...chartConfig,
              color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
              propsForDots: {
                r: '3',
                strokeWidth: '2',
                stroke: '#2196F3',
              },
            }}
            bezier
            style={styles.chart}
          />
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Min</Text>
              <Text style={styles.statValue}>{Math.round(waterStats.min)}%</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Avg</Text>
              <Text style={styles.statValue}>{Math.round(waterStats.avg)}%</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Max</Text>
              <Text style={styles.statValue}>{Math.round(waterStats.max)}%</Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Showing {historyData.length} data points over {timeRange === '1day' ? '24 hours' : timeRange === '1week' ? '7 days' : '30 days'}
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
  timeRangeContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  timeButton: {
    flex: 1,
    padding: 12,
    marginHorizontal: 5,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  timeButtonActive: {
    backgroundColor: '#4CAF50',
  },
  timeButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  timeButtonTextActive: {
    color: '#fff',
  },
  chartContainer: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 5,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
  },
});