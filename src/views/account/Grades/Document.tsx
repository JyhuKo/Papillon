import {
  NativeItem,
  NativeList,
  NativeListHeader,
  NativeText,
} from "@/components/Global/NativeComponents";
import { getSubjectData } from "@/services/shared/Subject";
import { useTheme } from "@react-navigation/native";
import React, { useEffect, useLayoutEffect, useState } from "react";
import { Image, ScrollView, Text, View, Platform } from "react-native";
import * as StoreReview from "expo-store-review";
import {
  Asterisk,
  Calculator,
  Scale,
  School,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react-native";
import { getAverageDiffGrade } from "@/utils/grades/getAverages";
import type { AverageDiffGrade } from "@/utils/grades/getAverages";
import { Screen } from "@/router/helpers/types";
import InsetsBottomView from "@/components/Global/InsetsBottomView";
import AsyncStorage from "@react-native-async-storage/async-storage";

const GradeDocument: Screen<"GradeDocument"> = ({ route, navigation }) => {
  const { grade, allGrades = [] } = route.params;
  const theme = useTheme();

  const [subjectData, setSubjectData] = useState({
    color: "#888888",
    pretty: "Matière inconnue",
    emoji: "❓",
  });

  const [shouldShowReviewOnClose, setShouldShowReviewOnClose] = useState(false);

  const askForReview = async () => {
    StoreReview.isAvailableAsync().then((available) => {
      if (available) {
        StoreReview.requestReview();
      }
    });
  };

  // on modal closed
  useEffect(() => {
    navigation.addListener("beforeRemove", () => {
      if (shouldShowReviewOnClose) {
        AsyncStorage.getItem("review_given").then((value) => {
          if(!value) {
            askForReview();
            AsyncStorage.setItem("review_given", "true");
          }
        });
      }
    });
  });

  useEffect(() => {
    AsyncStorage.getItem("review_openGradeCount").then((value) => {
      if (value) {
        if (parseInt(value) >= 5) {
          AsyncStorage.setItem("review_openGradeCount", "0");
          setShouldShowReviewOnClose(true);
        }
        else {
          AsyncStorage.setItem("review_openGradeCount", (parseInt(value) + 1).toString());
        }
      } else {
        AsyncStorage.setItem("review_openGradeCount", "1");
      }
    });
  }, []);

  const fetchSubjectData = () => {
    const data = getSubjectData(grade.subjectName);
    setSubjectData(data);
  };

  useEffect(() => {
    fetchSubjectData();
  }, [grade.subjectName]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: "Note en " + subjectData.pretty,
      headerStyle: {
        backgroundColor: Platform.OS === "android" ? subjectData.color : undefined,
      },
      headerTintColor: "#ffffff",
    });
  }, [navigation, subjectData]);

  const [gradeDiff, setGradeDiff] = useState({} as AverageDiffGrade);
  const [classDiff, setClassDiff] = useState({} as AverageDiffGrade);

  useEffect(() => {
    const gD = getAverageDiffGrade(
      [grade],
      allGrades,
      "student"
    ) as AverageDiffGrade;
    const cD = getAverageDiffGrade(
      [grade],
      allGrades,
      "average"
    ) as AverageDiffGrade;

    setGradeDiff(gD);
    setClassDiff(cD);
  }, [grade]);

  const lists = [
    {
      title: "Informations",
      items: [
        {
          icon: <Asterisk />,
          title: "Coefficient",
          description: "Coefficient de la note",
          value: "x" + grade.coefficient.toFixed(2),
        },
        grade.outOf.value !== 20 &&
          !grade.student.disabled && {
          icon: <Calculator />,
          title: "Remis sur /20",
          description: "Valeur recalculée sur 20",
          value:
              typeof grade.student.value === "number" &&
              typeof grade.outOf.value === "number"
                ? ((grade.student.value / grade.outOf.value) * 20).toFixed(2)
                : "??",
          bareme: "/20",
        },
      ].filter(Boolean),
    },
    {
      title: "Ma classe",
      items: [
        {
          icon: <Users />,
          title: "Note moyenne",
          description: "Moyenne de la classe",
          value: grade.average.value?.toFixed(2) ?? "??",
          bareme: "/" + grade.outOf.value,
        },
        {
          icon: <UserPlus />,
          title: "Note maximale",
          description: "Meilleure note de la classe",
          value: grade.max.value?.toFixed(2) ?? "??",
          bareme: "/" + grade.outOf.value,
        },
        {
          icon: <UserMinus />,
          title: "Note minimale",
          description: "Moins bonne note de la classe",
          value:
            grade.min.value?.toFixed(2) &&
            grade.min.value.toFixed(2) !== "-1.00"
              ? grade.min.value?.toFixed(2)
              : "??",
          bareme: "/" + grade.outOf.value,
        },
      ].filter(Boolean),
    },
    {
      title: "Influence",
      items: [
        !grade.student.disabled && {
          icon: <Scale />,
          title: "Moyenne générale",
          description: "Impact estimé sur la moyenne générale",
          value:
            gradeDiff.difference === undefined
              ? "???"
              : (gradeDiff.difference > 0
                ? "- "
                : gradeDiff.difference === 0
                  ? "+/- "
                  : "+ ") +
                gradeDiff.difference.toFixed(2).replace("-", "") +
                " pts",
          color:
            gradeDiff.difference === undefined
              ? void 0
              : gradeDiff.difference < 0
                ? "#4CAF50"
                : gradeDiff.difference === 0
                  ? theme.colors.text
                  : "#F44336",
        },
        !grade.average.disabled && {
          icon: <School />,
          title: "Moyenne de la classe",
          description: "Impact de la note sur la moyenne de la classe",
          value:
            classDiff.difference === undefined
              ? "???"
              : (classDiff.difference > 0
                ? "- "
                : gradeDiff.difference === 0
                  ? "+/- "
                  : "+ ") +
                classDiff.difference.toFixed(2).replace("-", "") +
                " pts",
        },
      ].filter(Boolean),
    },
  ].filter(list => list.items.length > 0);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.background,
        borderCurve: "continuous",
      }}
    >
      <View
        style={{
          borderCurve: "continuous",
          minHeight: 180,
          backgroundColor: subjectData.color,
        }}
      >
        <View
          style={{
            backgroundColor: "#00000043",
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            zIndex: -1,
          }}
        >
          <Image
            source={require("../../../../assets/images/mask_stars_settings.png")}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              tintColor: "#ffffff",
              opacity: 0.15,
            }}
          />
        </View>

        {Platform.OS === "ios" &&
            <View
              style={{
                backgroundColor: "#ffffff",
                width: 60,
                height: 4,
                borderRadius: 2,
                alignSelf: "center",
                opacity: 0.3,
                marginVertical: 8,
              }}
            />
        }

        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 16,
            gap: 6,
            flex: 1,
            justifyContent: "flex-end",
          }}
        >
          <Text
            style={{
              color: "#ffffff",
              fontSize: 14,
              letterSpacing: 1,
              textTransform: "uppercase",
              fontFamily: "semibold",
              opacity: 0.6,
            }}
            numberOfLines={1}
          >
            {subjectData.pretty}
          </Text>
          <Text
            style={{
              color: "#ffffff",
              fontSize: 17,
              fontFamily: "semibold",
              opacity: 1,
            }}
            numberOfLines={1}
          >
            {grade.description || "Note sans description"}
          </Text>
          <Text
            style={{
              color: "#ffffff",
              fontSize: 15,
              fontFamily: "medium",
              opacity: 0.6,
            }}
            numberOfLines={1}
          >
            {new Date(grade.timestamp).toLocaleDateString("fr-FR", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </Text>

          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-end",
              justifyContent: "flex-start",
              gap: 2,
              marginTop: 8,
            }}
          >
            <Text
              style={{
                color: "#ffffff",
                fontSize: 28,
                fontFamily: "semibold",
                opacity: 1,
              }}
              numberOfLines={1}
            >
              {grade.student.disabled ? (grade.student.status === null ? "N. Not" : grade.student.status) : grade.student.value?.toFixed(2)}
            </Text>
            <Text
              style={{
                color: "#ffffff",
                fontSize: 18,
                fontFamily: "medium",
                opacity: 0.6,
                marginBottom: 1,
              }}
              numberOfLines={1}
            >
              /{grade.outOf.value}
            </Text>
          </View>
        </View>
      </View>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        style={{
          flex: 1,
          width: "100%",
          maxWidth: 500,
          backgroundColor: theme.colors.background,
          borderCurve: "continuous",
          overflow: "hidden",
        }}
        contentContainerStyle={{
          width: "100%",
        }}
      >
        <View
          style={{
            minHeight: "100%",
            width: "100%",
            maxWidth: 500,
            backgroundColor: theme.colors.background,
            borderCurve: "continuous",
          }}
        >

          <View
            style={{
              paddingHorizontal: 16,
            }}
          >

            {lists.map((list, index) => (
              <View key={index+"gradedocidx"}>
                <NativeListHeader label={list.title} animated={false} />

                <NativeList animated={false}>
                  {list.items.map(
                    (item, index) =>
                      item && (
                        <NativeItem
                          animated={false}
                          key={index + "gradedocitemidx"}
                          icon={item.icon}
                          trailing={
                            <View
                              style={{
                                marginRight: 10,
                                alignItems: "flex-end",
                                flexDirection: "row",
                                gap: 2,
                              }}
                            >
                              <NativeText
                                animated={false}
                                style={{
                                  fontSize: 18,
                                  lineHeight: 22,
                                  fontFamily: "semibold",
                                  color: "color" in item ? item.color : theme.colors.text,
                                }}
                              >
                                {item.value}
                              </NativeText>

                              {"bareme" in item && (
                                <NativeText variant="subtitle" animated={false}>
                                  {item.bareme}
                                </NativeText>
                              )}
                            </View>
                          }
                        >
                          <NativeText variant="overtitle" animated={false}>{item.title}</NativeText>

                          {item.description && (
                            <NativeText variant="subtitle" animated={false}>
                              {item.description}
                            </NativeText>
                          )}
                        </NativeItem>
                      )
                  )}
                </NativeList>
              </View>
            ))}
          </View>
        </View>
        <InsetsBottomView />
      </ScrollView>
    </View>
  );
};

export default GradeDocument;
