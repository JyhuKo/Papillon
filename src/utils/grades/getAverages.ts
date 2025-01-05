// Importation du type `Grade` depuis `shared/Grade`
import type { Grade } from "@/services/shared/Grade";

// Interface pour représenter l'historique des moyennes
export interface GradeHistory {
  value: number; // Valeur de la moyenne
  date: string; // Date associée à la moyenne
}

// Définition du type `Target` pour indiquer quel type de note ou moyenne cibler
type Target = "student" | "average" | "min" | "max";

// Définition du type `AverageDiffGrade` pour calculer la différence entre les moyennes
export type AverageDiffGrade = {
  difference?: number; // Différence de moyenne entre deux ensembles
  with: number; // Moyenne avec toutes les notes
  without: number; // Moyenne sans certaines notes
};

// Fonction pour calculer la moyenne générale selon Pronote
const getPronoteAverage = (
  grades: Grade[],
  target: Target = "student",
  useMath: boolean = false
): number => {
  try {
    // Si aucune note n'est fournie ou que la liste est vide, retourner -1
    if (!grades || grades.length === 0) return -1;

    // Grouper les notes par matière
    const groupedBySubject = grades.reduce(
      (acc: Record<string, Grade[]>, grade) => {
        (acc[grade.subjectId || grade.subjectName] ||= []).push(grade); // Ajouter la note à la liste correspondante
        return acc;
      },
      {}
    );

    let countedSubjects = 0; // Compteur de matières ayant des moyennes valides

    // Calculer la moyenne totale pondérée par matière
    const totalAverage = Object.values(groupedBySubject).reduce(
      (acc, subjectGrades) => {
        const subjectAverage = getSubjectAverage(subjectGrades, target, useMath);

        if (subjectAverage !== -1) {
          countedSubjects++; // Incrémenter le compteur de matières valides
          return acc + subjectAverage; // Ajouter la moyenne de la matière
        }

        return acc; // Ignorer les matières sans moyenne
      },
      0
    );

    // Retourner la moyenne globale en divisant par le nombre de matières
    return countedSubjects === 0 ? -1 : totalAverage / countedSubjects;
  } catch {
    return -1;
  }
};

// Fonction pour calculer la moyenne d'une matière selon ÉcoleDirecte
export const getSubjectAverage = (
  subject: Grade[],
  target: Target = "student",
  useMath: boolean = false
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
  target: Target = "student",
  useMath: boolean = false
): AverageDiffGrade => {
  try {
    const baseAverage = getSubjectAverage(list, target, useMath); // Moyenne avec toutes les notes
    const baseWithoutGradeAverage = getSubjectAverage(
      list.filter((grade) => JSON.stringify(grades[0]) !== JSON.stringify(grade)),
      target,
      useMath
    ); // Moyenne sans certaines notes

    return {
      difference: parseFloat((baseWithoutGradeAverage - baseAverage).toFixed(2)), // Calculer la différence
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

// Fonction pour générer un historique des moyennes
const getAveragesHistory = (
  grades: Grade[],
  target: Target = "student",
  final?: number,
  useMath: boolean = false
): GradeHistory[] => {
  try {
    // Générer l'historique des moyennes jusqu'à la date de chaque note
    const history = grades.map((grade, index) => ({
      value: getPronoteAverage(grades.slice(0, index + 1), target, useMath), // Moyenne jusqu'à ce point
      date: new Date(grade.timestamp).toISOString(), // Date de la note au format ISO
    }));

    // Trier l'historique par date
    history.sort((a, b) => a.date.localeCompare(b.date));

    // Ajouter un point final avec la moyenne finale (ou calculée)
    history.push({
      value: final ?? getPronoteAverage(grades, target, useMath), // Moyenne finale ou calculée
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
