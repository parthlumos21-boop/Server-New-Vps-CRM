import React, { useMemo } from 'react';
import { View, FlatList, StyleSheet, Text } from 'react-native';
import { TimelineReminderCard } from './TimelineReminderCard';

interface TimelineReminderListProps {
  data: any[];
  accountMap?: Record<string, any>;
  onRowPress: (item: any) => void;
}

const COLORS = ['#9C27B0', '#E53935', '#29B6C7', '#D96A55'];

const getDotColor = (status: string, title: string) => {
  const str = (status || '') + (title || '');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
};

export function TimelineReminderList({ data, accountMap, onRowPress }: TimelineReminderListProps) {
  
  if (!data || data.length === 0) {
    return null;
  }

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      const dateA = new Date(a.reminderDate || a.dueDate || a.remindAt || 0).getTime();
      const dateB = new Date(b.reminderDate || b.dueDate || b.remindAt || 0).getTime();
      return dateA - dateB;
    });
  }, [data]);

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const dateStr = item.reminderDate || item.dueDate || item.data?.reminderDate || item.data?.dueDate || item.remindAt;
    const dateObj = dateStr ? new Date(dateStr) : new Date();
    
    let isFirstOfDate = true;
    if (index > 0) {
      const prevItem = sortedData[index - 1];
      const prevDateStr = prevItem.reminderDate || prevItem.dueDate || prevItem.data?.reminderDate || prevItem.data?.dueDate || prevItem.remindAt;
      const prevDateObj = prevDateStr ? new Date(prevDateStr) : new Date();
      if (dateObj.toDateString() === prevDateObj.toDateString()) {
        isFirstOfDate = false;
      }
    }

    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNum = dateObj.getDate().toString();
    const dotColor = getDotColor(item.status, item.title || item.taskName);

    return (
      <View style={styles.itemWrapper}>
        <View style={styles.dateContainer}>
          {isFirstOfDate && (
            <>
              <Text style={styles.dayText}>{dayName}</Text>
              <Text style={styles.dateText}>{dayNum}</Text>
            </>
          )}
        </View>

        <View style={styles.timelineAxis}>
          {isFirstOfDate && index > 0 && <View style={styles.timelineLineTop} />}
          <View style={[styles.timelineDot, { backgroundColor: dotColor }]} />
          {index < sortedData.length - 1 && <View style={styles.timelineLine} />}
        </View>
        
        <View style={styles.cardWrapper}>
          <TimelineReminderCard 
            item={item}
            accountInfo={accountMap ? accountMap[item.relatedEntityId] : undefined}
            onPress={() => onRowPress(item)}
          />
        </View>
      </View>
    );
  };

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: '#FFFFFF' }}
      data={sortedData}
      keyExtractor={(item) => item._id || item.id || Math.random().toString()}
      renderItem={renderItem}
      contentContainerStyle={styles.listContainer}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  listContainer: {
    flexGrow: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
    paddingBottom: 100,
    backgroundColor: '#FFFFFF',
  },
  itemWrapper: {
    flexDirection: 'row',
  },
  dateContainer: {
    width: 45,
    alignItems: 'center',
    paddingTop: 4,
  },
  dayText: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '500',
  },
  dateText: {
    fontSize: 16,
    color: '#171717',
    fontWeight: 'bold',
    marginTop: 2,
  },
  timelineAxis: {
    width: 24,
    alignItems: 'center',
    marginRight: 12,
    marginLeft: 4,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 10,
    zIndex: 2,
  },
  timelineLine: {
    position: 'absolute',
    top: 20, 
    bottom: -10, 
    width: 1,
    backgroundColor: '#DCDCDC',
    zIndex: 1,
  },
  timelineLineTop: {
    position: 'absolute',
    top: -10, 
    bottom: 0, 
    width: 1,
    backgroundColor: '#DCDCDC',
    zIndex: 1,
  },
  cardWrapper: {
    flex: 1,
    paddingBottom: 24,
  }
});
