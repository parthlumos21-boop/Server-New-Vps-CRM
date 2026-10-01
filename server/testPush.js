const { Expo } = require('expo-server-sdk');

const expo = new Expo();

async function testPush() {
  const token = 'ExponentPushToken[Tag5BcD8PXP7Z4ZrgF70HV]';
  
  if (!Expo.isExpoPushToken(token)) {
    console.error(`Push token ${token} is not a valid Expo push token`);
    return;
  }

  const messages = [{
    to: token,
    sound: 'default',
    title: 'CRM Test Notification',
    body: 'Testing lock screen notification',
    data: { withSome: 'data' },
    channelId: 'crm-high-priority',
    priority: 'high',
    badge: 1,
  }];

  try {
    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      console.log('Sending chunk:', JSON.stringify(chunk, null, 2));
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      console.log('Expo Ticket Response:', JSON.stringify(ticketChunk, null, 2));
      
      const receiptIds = ticketChunk.filter(t => t.id).map(t => t.id);
      if (receiptIds.length > 0) {
        console.log('Checking receipts for:', receiptIds);
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        let receiptIdChunks = expo.chunkPushNotificationReceiptIds(receiptIds);
        for (let chunk of receiptIdChunks) {
          try {
            let receipts = await expo.getPushNotificationReceiptsAsync(chunk);
            console.log('Receipts:', JSON.stringify(receipts, null, 2));
          } catch (error) {
            console.error('Error fetching receipts:', error);
          }
        }
      }
    }
  } catch (error) {
    console.error('Push error:', error);
  }
}

testPush();
