import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import apiClient from '../../src/api/client';

export default function SupportDetailScreen() {
  const { id } = useLocalSearchParams();
  const [ticket, setTicket] = useState<any>(null);
  const [replies, setReplies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const ticketRes = await apiClient.get(`/support-requests/${id}`);
      if (ticketRes.data?.success) {
        setTicket(ticketRes.data.data);
      }

      const repliesRes = await apiClient.get(`/support-requests/${id}/replies`);
      if (repliesRes.data?.success) {
        setReplies(repliesRes.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching ticket details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setIsSubmitting(true);
    try {
      const response = await apiClient.post(`/support-requests/${id}/reply`, {
        message: replyText
      });
      if (response.data?.success) {
        setReplyText('');
        fetchData(); // Refresh replies
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send reply');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#33447D" />
      </View>
    );
  }

  if (!ticket) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Ticket not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.title}>{ticket.subject}</Text>

          <View style={styles.row}>
            <Text style={styles.label}>Ticket #:</Text>
            <Text style={styles.value}>{ticket.ticketNo || ticket.id}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Status:</Text>
            <Text style={styles.value}>{ticket.status}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Description:</Text>
            <Text style={styles.value}>{ticket.description || 'N/A'}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Replies</Text>
        {replies.length === 0 ? (
          <Text style={styles.emptyText}>No replies yet.</Text>
        ) : (
          replies.map((reply, index) => (
            <View key={index} style={styles.replyCard}>
              <Text style={styles.replyMeta}>{reply.userName || reply.user_name || 'User'} - {new Date(reply.createdAt || reply.created_at).toLocaleString()}</Text>
              <Text style={styles.replyText}>{reply.message || reply.content}</Text>
            </View>
          ))
        )}
      </ScrollView>

      {/* Reply Input Area */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type your reply..."
          value={replyText}
          onChangeText={setReplyText}
          multiline
          editable={!isSubmitting}
        />
        <TouchableOpacity
          style={styles.sendButton}
          onPress={handleReply}
          disabled={isSubmitting || !replyText.trim()}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.sendButtonText}>Send</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100, // Make room for input area
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  label: {
    width: 90,
    fontSize: 14,
    fontWeight: '600',
    color: '#4a5568',
  },
  value: {
    flex: 1,
    fontSize: 14,
    color: '#2d3748',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 12,
  },
  emptyText: {
    color: '#718096',
    fontStyle: 'italic',
  },
  replyCard: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#33447D',
  },
  replyMeta: {
    fontSize: 12,
    color: '#718096',
    marginBottom: 8,
  },
  replyText: {
    fontSize: 14,
    color: '#2d3748',
  },
  errorText: {
    fontSize: 16,
    color: '#e53e3e',
  },
  inputContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f7fa',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    minHeight: 40,
    marginRight: 12,
  },
  sendButton: {
    backgroundColor: '#33447D',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    justifyContent: 'center',
  },
  sendButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  }
});
