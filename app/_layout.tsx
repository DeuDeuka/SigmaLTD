import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from "@/app/screens/LoginScreen";

type RootStackParamList = {
  Login: undefined;
  Profile: { userId: string };
  Feed: { sort: 'latest' | 'top' } | undefined;
};

const RootStack = createStackNavigator<RootStackParamList>();

export default function RootLayout() {
  return <RootStack.Navigator initialRouteName="Login">
    <RootStack.Screen
        name="Login"
        component={LoginScreen} />
  </RootStack.Navigator>;
}
