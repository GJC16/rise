// lib/firebase-admin.ts
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const app =
  getApps().length === 0
    ? initializeApp({
        credential: cert({
          projectId: "rise-iot",
          clientEmail: "firebase-adminsdk-fbsvc@rise-iot.iam.gserviceaccount.com",
          privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCYwm8pzxdOqAkL\n749KJEFLv4y2Tk6O6XE+a+r5gYeuWqx1MELnSKxPaqNMNjk+6LFV58SWf0t26BIr\ncQYErtF88BVeXGzk8Odomagr84jRtyjR0ySK37Ux9MKFAIkzuSbmzOPWc4dCl58C\nFAX7/kAasteTvXAzlEc+cgQr/UxwKIuCo6xh9ng6Oy88uHy9dRXk0XdXaN3PphAu\nHJbXwhOmHWK9SyfmJiE+oXOVS35hZOlBQ2RK/ME2ym/kSkCwogEX1Oq9dsFNGEzJ\nn1XIB2/prJnhMKHk9A4qFjgm6FhFsGNk2IKozJ+b42TyA0JCW5iU9uxbr4d7nFQe\nvA6DOsL1AgMBAAECggEAAKeDyIi/ZJFArVnTjCKvCWh36kbVDwXOVoZCpgAI+GmX\n/yJ26T5sjDD68ZsFXmOqoxgBpnOU2SxscHogMnlUEAH4PtRBjLgkoPBFnJXnHEfX\nQadsqtfqYPrLLp2Yjrbxck1PQpZ+il6hp8lz7U4FQ7D9NXab4tKHom0WaPNj5Ek9\n5UyIhaONysASJbzDmKbM/JHiKmVQTzw91evxPixqi5LLFGiQNGN2N/VMTKviTINI\n7ryqGckivlCI8HMEDhC51zmZiNoqYjVB4tr48YbOwq/9V/hrOxPSaLpDxhNsM5Xr\nlOkxAKrLcsEDs/s5WIYkcS8TRkPCggfatvndRzDGiQKBgQDK8xcoNH8OR33xVW6x\nBHF0H0RZ2lJgjUNj5AIROFEKBbX5gha5UHJJSIorkMHQcL9e2EJnVY/uI4kneV+f\nVVKzIgN0ki+PzuePzAVguxo15lWy3sJd2fDK9sGqWbZlDJYMZHQKFiT0WoH6E5y2\na3MimyBvUOuwv07WOHpUapxU6wKBgQDAsL4ORiE8QO6Zn9zME+MLXsIXUVi0RgUV\nKkc7rN/9ff+/i2wCsMkWMC6Ii8bkmo0XZsqT4St8WF9d2cPIGBh0IH+WXO2AJ3bk\nHzQvfbIdHVhi7mhSYY0MyTO2jH5MBqMVee1KcH+09sLGQ1UZhoEuCdjUExMGnMoq\nUJOzLGjPnwKBgF/hbMVP1971I6kKhZsX0EneI7qXjGeVFYtxwxBDnPWxMQHJ1daD\nDRtWLADdCNPjEGZMoUKUh8UoALone2eZNdLvdNZz4gh85aVn6/qBKqbgRQiWeRlB\nx6L75Q8IB0XCJnmAU9oYEClpQRLWhSkhpmlpBG/SuSbtmt9WG2UaYPU1AoGACnPL\n63RMaztOdhDg5kUR5NUADEnCWQ0PS4WelZMcF2EVVWuXsVGrpsN4UrnaUR49Fw7h\nYEIvnLAihDHC2ADOmsYEhcCGtZPudBNpPkZAOioUWFF8YTOfdhkX8AgQ9cjKYeja\nQVZ25vcXu699V0Qfj8LC+0YJmys4IDF8wZRgHxsCgYB2MqBzM5FNoVU4+PMjeIUd\nTazfEwv4gvf7VeVoTr3pLcqjJT65/fInbfvOe7y7QDRC3Wh6am9oSkEMuobhjN/m\nn2izs8h6xXyQvHQX3htbNGk/yp4/kypVT3xB4kgXRCpBtMW/sJo7LNfq2uBNu6ph\nTQQfK9GKV7ciStRrJ8Za1g==\n-----END PRIVATE KEY-----\n",
        }),
      })
    : getApps()[0];

export const db = getFirestore(app);
