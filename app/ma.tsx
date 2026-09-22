import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const COLORS = {
    yellow: '#FFC107',
  yellowLight: '#FFF3CD',
  yellowDark: '#B8860B',
  red: '#E53935',
  redLight: '#FDE8E7',
  redDark: '#8E1C1C',
  white: '#FFFFFF',

  
};

export default function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>

        {/* Greeting */}
        <Text style={styles.greeting}>
          Hello, Name
        </Text>

        {/* Remaining Quota Card */}
        <View style={[styles.card, styles.quotaCard]}>
          <View style={styles.quotaTextWrap}>
            <Text style={styles.cardLabel}>
              Remaining Quota
            </Text>

            <Text style={styles.quotaValue}>
              20.00 L
            </Text>
          </View>

          <View style={styles.quotaIconWrap}>
            <Ionicons
              name="water"
              size={26}
              color={COLORS.yellow}
            />
          </View>
        </View>

        {/* Add Transaction Card */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.card, styles.transactionCard]}
          onPress={() => router.push('/Login')}
        >
          <Text style={styles.transactionLabel}>
            Add Transaction
          </Text>

          <View style={styles.transactionIconCircle}>
            <Ionicons
              name="swap-horizontal"
              size={22}
              color={COLORS.white}
            />
          </View>
        </TouchableOpacity>

        {/* Spacer */}
        <View style={styles.spacer} />

        {/* Bottom Navigation */}
        <View style={styles.bottomNav}>

          <NavButton
            icon="home"
            label="Home"
            active
            onPress={() => router.push('/')}
          />

          <NavButton
            icon="location"
            label="Maps"
            onPress={() => router.push('/Login')}
          />

          <NavButton
            icon="pie-chart"
            label="Transactions"
            onPress={() =>
              router.push('/Login')
            }
          />

          <NavButton
            icon="person"
            label="Profile"
            onPress={() => router.push('/Login')}
          />

        </View>
      </View>
    </SafeAreaView>
  );
}

function NavButton({
  icon,
  label,
  active = false,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  const color = active
    ? COLORS.red
    : COLORS.yellowDark;

  return (
    <TouchableOpacity
      style={styles.navButton}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons
        name={icon}
        size={22}
        color={color}
      />

      <Text
        style={[
          styles.navLabel,
          { color: color },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },

  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  greeting: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.redDark,
    marginBottom: 20,
  },

  card: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  quotaCard: {
    backgroundColor: COLORS.yellowLight,
    borderWidth: 1,
    borderColor: COLORS.yellow,
  },

  quotaTextWrap: {
    flexShrink: 1,
  },

  cardLabel: {
    fontSize: 15,
    color: COLORS.yellowDark,
    marginBottom: 6,
  },

  quotaValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.yellowDark,
  },

  quotaIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  transactionCard: {
    backgroundColor: COLORS.redLight,
    borderWidth: 1,
    borderColor: COLORS.red,
  },

  transactionLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.redDark,
  },

  transactionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.red,
    alignItems: 'center',
    justifyContent: 'center',
  },

  spacer: {
    flex: 1,
  },

  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.yellowLight,
    paddingTop: 10,
    paddingBottom: 8,
  },

  navButton: {
    flex: 1,
    alignItems: 'center',
  },

  navLabel: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
});