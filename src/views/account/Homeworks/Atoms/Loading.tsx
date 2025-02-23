import { useTheme } from "@react-navigation/native";
import { ActivityIndicator, Platform, Text } from "react-native";

import Reanimated, {
  FadeIn,
  FadeOut
} from "react-native-reanimated";

const HomeworksLoading = () => {
  const colors = useTheme().colors;

  return (
    <Reanimated.View
      entering={FadeIn.springify().mass(1).damping(20).stiffness(300)}
      exiting={Platform.OS === "ios" ? FadeOut.springify().mass(1).damping(20).stiffness(300) : undefined}
      style={{
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <ActivityIndicator size={20} />

      <Text
        style={{
          color: colors.text,
          fontSize: 18,
          textAlign: "center",
          fontFamily: "semibold",
          marginTop: 10,
        }}
      >
        Chargement des cours...
      </Text>

      <Text
        style={{
          color: colors.text,
          fontSize: 16,
          textAlign: "center",
          fontFamily: "medium",
          marginTop: 4,
          opacity: 0.5,
        }}
      >
        Patiente, s'il te plaît
      </Text>
    </Reanimated.View>
  );
};

export default HomeworksLoading;