import { Query } from "appwrite";

import { tablesDB } from "./appwrite.js";
import { APPWRITE_DATABASE_ID } from "../constants.js";
import { getSession } from "../utils/session.js";

export default class Database {
  static async saveNewUser(userId, email, name) {
    await tablesDB.createRow({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: "users",
      rowId: userId,
      data: {
        userId,
        email,
        name,
      },
    });
  }

  // saves analysis result on the db
  static async saveAnalysisResult(fileName, fileType, analysisResult) {
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
  static async getUserAnalyses() {
    const { userId } = await getSession();
    if (!userId) return;

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
    const userData = await tablesDB.listRows({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: "users",
      queries: [Query.equal("userId", userId)],
    });

    if (userData.total === 0) {
      return null;
    }

    const user = userData.rows[0];
    return {
      userId: user.userId,
      email: user.email,
      name: user.name,
    };
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
