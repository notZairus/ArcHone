import { Query } from "appwrite";

import { tablesDB } from "./appwrite.js";
import { APPWRITE_DATABASE_ID } from "../constants.js";
import { getSession } from "../utils/session.js";

export default class Database {
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
}

// ========================== Helper functions ========================== //

async function analysisPropertySaver(tableId, analysisId, data) {
  await tablesDB.createRow({
    databaseId: APPWRITE_DATABASE_ID,
    tableId,
    rowId: "unique()",
    data: {
      analysisId: analysisId,
      ...data,
    },
  });
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
