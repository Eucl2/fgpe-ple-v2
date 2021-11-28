import { gql } from "@apollo/client";

export const GET_PLAYER = gql`
  query getPlayerQuery($gameId: String!, $userId: String!) {
    player(gameId: $gameId, userId: $userId) {
      id

      learningPath {
        challenge {
          name
        }
        progress
      }

      game {
        id
        name
        groups {
          id
          name
          displayName
        }

        challenges {
          id
          name
          refs {
            id
            name
          }
        }
      }

      user {
        id
        username
        email
        firstName
        lastName
      }

      group {
        id
        name
      }

      stats {
        nrOfSubmissions
        nrOfValidations
        nrOfSubmissionsByActivity
        nrOfValidationsByActivity
        nrOfSubmissionsByActivityAndResult
        nrOfValidationsByActivityAndResult
      }
    }
  }
`;
