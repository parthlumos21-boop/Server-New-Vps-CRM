# CRM Mobile

React Native/Expo scaffold for the CRM backend.

Routes in this scaffold:

- `login` -> `src/screens/LoginScreen.js`
- `logout` -> `src/screens/LogoutScreen.js`
- `admin` -> `src/screens/AdminScreen.js`
- `users` -> `src/screens/UsersScreen.js`

Auth flow:

- Mobile login calls `/api/auth/login` with `clientType: "mobile"` and `includeToken: true`.
- The backend still stores refresh-session hashes in MongoDB.
- The app stores returned access/refresh tokens in `expo-secure-store`.
- API calls use `Authorization: Bearer <token>`.

Set the backend URL before running on a physical device:

```powershell
$env:EXPO_PUBLIC_API_URL="http://YOUR-LAN-IP:5000/api"
npm run start
```
