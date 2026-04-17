import { Query } from "appwrite";

import { tablesDB } from "./appwrite.js";
import { APPWRITE_DATABASE_ID } from "../constants.js";
import { getSession } from "../utils/session.js";

export default class Database {
  static async saveNewUser(userId, email, name, role) {
    await tablesDB.createRow({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: "users",
      rowId: userId,
      data: {
        email,
        name,
        role,
      },
    });
  }

  // saves analysis result on the db
  static async saveAnalysisResult(fileName, fileType, code, analysisResult) {
    const { userId } = await getSession();
    if (!userId) return;

    const { $id: analysisId } = await tablesDB.createRow({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: "analyses",
      rowId: "unique()",
      data: {
        userId: userId,
        fileName: fileName,
        fileType: fileType,
        code: code,
      },
    });

    const entries = Object.entries(analysisResult);

    for (const [key, value] of entries) {
      for (const item of value) {
        await analysisPropertySaver(key, analysisId, item);
      }
    }

    return;
  }

  // fetch all analyses of the user from the db
  static async getUserAnalyses(userId) {
    const analyses = await tablesDB.listRows({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: "analyses",
      queries: [Query.equal("userId", userId)],
    });

    const formattedAnalyses = analyses.rows.map((analysis) => ({
      id: analysis.$id,
      fileName: analysis.fileName,
      fileType: analysis.fileType,
      createdAt: analysis.$createdAt,
      updatedAt: analysis.$updatedAt,
    }));

    const properties = ["comments", "issues", "functions", "variables"];

    const formattedAnalysesWithProperties = await Promise.all(
      formattedAnalyses.map(async (analysis) => {
        const analysisId = analysis.id;
        const propertiesData = {};

        for (const property of properties) {
          propertiesData[property] = await getAnalysisProperty(
            property,
            analysisId,
          );
        }

        return {
          ...analysis,
          ...propertiesData,
        };
      }),
    );

    return formattedAnalysesWithProperties;
  }

  static async getUserById(userId) {
    const user = await tablesDB.getRow({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: "users",
      rowId: userId,
    });

    if (!user) {
      return null;
    }

    return user;
  }

  static async getClassroomsByUserId(userId) {
    const resultAccepted = await tablesDB.listRows({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: "classroom_user",
      queries: [Query.equal("userId", userId), Query.equal("accepted", true)],
    });

    const resultPending = await tablesDB.listRows({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: "classroom_user",
      queries: [Query.equal("userId", userId), Query.equal("accepted", false)],
    });

    const classroomIdsAccepted = resultAccepted.rows.map(
      (row) => row.classroomId,
    );

    const classroomIdsPending = resultPending.rows.map(
      (row) => row.classroomId,
    );

    const classrooms = [];

    for (const classroomId of classroomIdsAccepted) {
      const classroomResultAccepted = await tablesDB.getRow({
        databaseId: APPWRITE_DATABASE_ID,
        tableId: "classrooms",
        rowId: classroomId,
      });

      if (classroomResultAccepted) {
        classroomResultAccepted.accepted = true;
        classrooms.push(classroomResultAccepted);
      }
    }

    for (const classroomId of classroomIdsPending) {
      const classroomResultPending = await tablesDB.getRow({
        databaseId: APPWRITE_DATABASE_ID,
        tableId: "classrooms",
        rowId: classroomId,
      });

      if (classroomResultPending) {
        classroomResultPending.accepted = false;
        classrooms.push(classroomResultPending);
      }
    }

    return classrooms;
  }

  static async joinClassroom(userId, classroomCode) {
    const classrooms = await tablesDB.listRows({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: "classrooms",
      queries: [Query.equal("code", classroomCode)],
    });

    if (classrooms.total === 0) {
      throw new Error("Invalid classroom code.");
    }

    const classroom = classrooms.rows[0];

    await tablesDB.createRow({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: "classroom_user",
      rowId: "unique()",
      data: {
        userId,
        classroomId: classroom.$id,
        accepted: false,
      },
    });

    return true;
  }
}

// ========================== Helper functions ========================== //

async function analysisPropertySaver(tableId, analysisId, data) {
  const sanitizedData = sanitizeDataForTable(tableId, data);

  await tablesDB.createRow({
    databaseId: APPWRITE_DATABASE_ID,
    tableId,
    rowId: "unique()",
    data: {
      analysisId: analysisId,
      ...sanitizedData,
    },
  });
}

function sanitizeDataForTable(tableId, data) {
  if (tableId !== "issues") {
    return data;
  }

  const { principle, ...dbCompatibleIssue } = data;
  return dbCompatibleIssue;
}

async function getAnalysisProperty(tableId, analysisId) {
  const properties = await tablesDB.listRows({
    databaseId: APPWRITE_DATABASE_ID,
    tableId,
    queries: [Query.equal("analysisId", analysisId)],
  });

  return properties.rows.map((property) => ({
    id: property.$id,
    ...property,
  }));
}
