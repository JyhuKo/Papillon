// On importe le type `Grade` depuis le chemin spécifié
import type { Grade } from "@/services/shared/Grade";

// Définition de l'interface `GradeHistory` pour représenter l'historique des moyennes avec une valeur numérique et une date
export interface GradeHistory {
  value: number; // La valeur de la moyenne
  date: string; // La date associée à la moyenne
}

// Définition du type `Target` qui indique quel type de note ou de moyenne cibler
type Target = "student" | "average" | "min" | "max";

// Définition du type `AverageDiffGrade` pour calculer la différence entre les moyennes avec et sans certaines notes
export type AverageDiffGrade = {
  difference?: number; // La différence de moyenne entre deux ensembles de notes
  with: number; // La moyenne avec toutes les notes
  without: number; // La moyenne sans certaines notes
};

// Fonction pour calculer la moyenne générale selon ÉcoleDirecte
const getPronoteAverage = (
  grades: Grade[],
  target: Target = "student"
): number => {
  try {
    // Si aucune note n'est fournie ou que la liste est vide, retourner -1
    if (!grades || grades.length === 0) return -1;

    // Grouper les notes par matière
    const groupedBySubject = grades.reduce(
      (acc: Record<string, { grades: Grade[]; coefficient: number }>, grade) => {
        const subjectKey = grade.subjectId || grade.subjectName; // Identifiant ou nom de la matière
        if (!acc[subjectKey]) {
          acc[subjectKey] = { grades: [], coefficient: grade.subjectCoefficient || 1 };
        }
        acc[subjectKey].grades.push(grade); // Ajouter la note à la liste des notes pour la matière correspondante
        return acc;
      },
      {}
    );

    let totalWeightedSum = 0; // Somme des moyennes pondérées par matière
    let totalCoefficient = 0; // Somme des coefficients

    // Calculer la moyenne par matière et ajouter à la somme pondérée
    Object.values(groupedBySubject).forEach(({ grades: subjectGrades, coefficient }) => {
      const subjectAverage = getSubjectAverage(subjectGrades, target); // Moyenne de la matière
      if (subjectAverage !== -1) {
        totalWeightedSum += subjectAverage * coefficient; // Ajouter à la somme pondérée
        totalCoefficient += coefficient; // Ajouter le coefficient
      }
    });

    // Retourner la moyenne générale pondérée
    return totalCoefficient === 0 ? -1 : parseFloat((totalWeightedSum / totalCoefficient).toFixed(2));
  } catch {
    return -1;
  }
};

// Fonction pour calculer la moyenne d'une matière selon ÉcoleDirecte
export const getSubjectAverage = (
  subject: Grade[],
  target: Target = "student"
): number => {
  try {
    let weightedSum = 0; // Somme pondérée des notes
    let totalCoefficient = 0; // Somme des coefficients

    // Parcourir chaque note pour les convertir et les pondérer
    subject.forEach((grade) => {
      const targetGrade = grade[target]; // Note cible choisie
      if (
        !targetGrade || // Vérifier si la note est invalide
        targetGrade.disabled ||
        targetGrade.value === null ||
        targetGrade.value < 0 ||
        grade.coefficient === 0 ||
        typeof targetGrade.value !== "number"
      )
        return;

      // Conversion des notes sur une base de 20 si nécessaire
      const outOfValue = grade.outOf.value!; // Valeur maximale possible pour la note
      const normalizedValue =
        outOfValue !== 20 ? (targetGrade.value / outOfValue) * 20 : targetGrade.value; // Ajuster pour une base sur 20

      // Ajouter à la somme pondérée
      weightedSum += normalizedValue * grade.coefficient;
      totalCoefficient += grade.coefficient;
    });

    // Si aucun coefficient n'est comptabilisé, retourner -1
    if (totalCoefficient === 0) return -1;

    // Retourner la moyenne calculée, arrondie au centième
    return parseFloat((weightedSum / totalCoefficient).toFixed(2));
  } catch {
    return -1;
  }
};

// Fonction pour calculer la différence de moyenne avec et sans certaines notes
const getAverageDiffGrade = (
  grades: Grade[],
  list: Grade[],
  target: Target = "student"
): AverageDiffGrade => {
  try {
    // Calculer la moyenne avec toutes les notes
    const baseAverage = getSubjectAverage(list, target);

    // Calculer la moyenne sans certaines notes
    const baseWithoutGradeAverage = getSubjectAverage(
      list.filter((grade) => JSON.stringify(grades[0]) !== JSON.stringify(grade)),
      target
    );

    return {
      difference: parseFloat((baseWithoutGradeAverage - baseAverage).toFixed(2)), // Différence entre les deux moyennes
      with: baseAverage, // Moyenne avec toutes les notes
      without: baseWithoutGradeAverage, // Moyenne sans certaines notes
    };
  } catch {
    return {
      difference: 0,
      with: 0,
      without: 0,
    };
  }
};

// Fonction pour générer un historique des moyennes au fil du temps
const getAveragesHistory = (
  grades: Grade[],
  target: Target = "student",
  final?: number
): GradeHistory[] => {
  try {
    // Générer l'historique des moyennes jusqu'à la date de chaque note
    const history = grades.map((grade, index) => ({
      value: getPronoteAverage(grades.slice(0, index + 1), target), // Moyenne jusqu'à ce point
      date: new Date(grade.timestamp).toISOString(), // Date au format ISO
    }));

    // Trier l'historique par date
    history.sort((a, b) => a.date.localeCompare(b.date));

    // Ajouter un point final avec la moyenne finale (ou calculée)
    history.push({
      value: final ?? getPronoteAverage(grades, target), // Moyenne finale ou calculée
      date: new Date().toISOString(), // Date actuelle
    });

    // Supprimer les valeurs NaN
    return history.filter((x) => !isNaN(x.value));
  } catch {
    return [];
  }
};

// Exportation des fonctions pour utilisation externe
export { getPronoteAverage, getAverageDiffGrade, getAveragesHistory };
