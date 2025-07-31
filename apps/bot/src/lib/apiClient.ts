import axios from "axios";
import {
  type CreatePlayerRequest,
  type PlayerCreatedResponse,
  type Player,
} from "@adventure/shared/types";
const SERVER_API_URL = process.env.SERVER_API_URL || "http://localhost:3000";
const SERVER_API_KEY = process.env.SERVER_API_KEY;

if (!SERVER_API_KEY) {
  console.error("SERVER_API_KEY is not set in environment variables!");
  process.exit(1);
}

const apiClient = axios.create({
  baseURL: `${SERVER_API_URL}/api`,
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": SERVER_API_KEY, // Authenticate bot with the server
  },
});

export class ServerApiClient {
  async createPlayer(
    data: CreatePlayerRequest
  ): Promise<PlayerCreatedResponse> {
    try {
      const response = await apiClient.post<Player>(`/player/create`, data);
      return {
        success: true,
        player: response.data,
        message: "Player created!",
      };
    } catch (error: any) {
      console.error(
        "Error creating player via API:",
        error.response?.data || error.message
      );
      return {
        success: false,
        message: error.response?.data?.message || "Failed to create player.",
      };
    }
  }

  async getPlayer(discordUserId: string): Promise<Player | null> {
    try {
      const response = await apiClient.get<Player>(`/player/${discordUserId}`);
      return response.data;
    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        return null;
      }
      console.error(
        "Error fetching player via API:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  async collectItem(
    discordUserId: string,
    itemDefinitionId: string,
    quantity: number,
    location: any
  ): Promise<boolean> {
    try {
      await apiClient.post(`/player/${discordUserId}/collect-item`, {
        itemDefinitionId,
        quantity,
        location,
      });
      return true;
    } catch (error: any) {
      console.error(
        "Error collecting item via API:",
        error.response?.data || error.message
      );
      return false;
    }
  }

  // Add more API methods as your game grows
}
