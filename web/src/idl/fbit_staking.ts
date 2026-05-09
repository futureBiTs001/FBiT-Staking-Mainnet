export type FbitStaking = {
  "version": "0.1.0",
  "name": "fbit_staking",
  "instructions": [
    {
      "name": "initialize",
      "accounts": [
        { "name": "platform", "isMut": true, "isSigner": false },
        { "name": "authority", "isMut": true, "isSigner": true },
        { "name": "rewardTokenMint", "isMut": false, "isSigner": false },
        { "name": "stakeTokenMint", "isMut": false, "isSigner": false },
        { "name": "systemProgram", "isMut": false, "isSigner": false },
        { "name": "tokenProgram", "isMut": false, "isSigner": false },
        { "name": "rent", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "rewardRate", "type": "u64" },
        { "name": "referralRewardRate", "type": "u64" }
      ]
    },
    {
      "name": "fundRewardPool",
      "accounts": [
        { "name": "platform", "isMut": true, "isSigner": false },
        { "name": "authority", "isMut": true, "isSigner": true },
        { "name": "funderTokenAccount", "isMut": true, "isSigner": false },
        { "name": "rewardVault", "isMut": true, "isSigner": false },
        { "name": "tokenProgram", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "amount", "type": "u64" }
      ]
    },
    {
      "name": "refundRewardPool",
      "accounts": [
        { "name": "platform", "isMut": true, "isSigner": false },
        { "name": "authority", "isMut": false, "isSigner": true },
        { "name": "authorityTokenAccount", "isMut": true, "isSigner": false },
        { "name": "rewardVault", "isMut": true, "isSigner": false },
        { "name": "tokenProgram", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "amount", "type": "u64" }
      ]
    },
    {
      "name": "depositReserve",
      "accounts": [
        { "name": "platform", "isMut": true, "isSigner": false },
        { "name": "authority", "isMut": true, "isSigner": true },
        { "name": "funderTokenAccount", "isMut": true, "isSigner": false },
        { "name": "reserveVault", "isMut": true, "isSigner": false },
        { "name": "tokenProgram", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "amount", "type": "u64" }
      ]
    },
    {
      "name": "releaseEmission",
      "accounts": [
        { "name": "platform", "isMut": true, "isSigner": false },
        { "name": "reserveVault", "isMut": true, "isSigner": false },
        { "name": "rewardVault", "isMut": true, "isSigner": false },
        { "name": "tokenProgram", "isMut": false, "isSigner": false }
      ],
      "args": []
    },
    {
      "name": "registerUser",
      "accounts": [
        { "name": "platform", "isMut": true, "isSigner": false },
        { "name": "userAccount", "isMut": true, "isSigner": false },
        { "name": "referrerAccount", "isMut": true, "isSigner": false },
        { "name": "owner", "isMut": true, "isSigner": true },
        { "name": "systemProgram", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "referrer", "type": { "option": "publicKey" } }
      ]
    },
    {
      "name": "stake",
      "accounts": [
        { "name": "platform", "isMut": true, "isSigner": false },
        { "name": "userAccount", "isMut": true, "isSigner": false },
        { "name": "stakeEntry", "isMut": true, "isSigner": false },
        { "name": "userTokenAccount", "isMut": true, "isSigner": false },
        { "name": "stakeVault", "isMut": true, "isSigner": false },
        { "name": "adminStakeAccount", "isMut": true, "isSigner": false },
        { "name": "rewardVault", "isMut": true, "isSigner": false },
        { "name": "owner", "isMut": true, "isSigner": true },
        { "name": "tokenProgram", "isMut": false, "isSigner": false },
        { "name": "systemProgram", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "amount", "type": "u64" },
        { "name": "lockPeriodIndex", "type": "u8" }
      ]
    },
    {
      "name": "claimRewards",
      "accounts": [
        { "name": "platform", "isMut": true, "isSigner": false },
        { "name": "userAccount", "isMut": true, "isSigner": false },
        { "name": "stakeEntry", "isMut": true, "isSigner": false },
        { "name": "userTokenAccount", "isMut": true, "isSigner": false },
        { "name": "rewardVault", "isMut": true, "isSigner": false },
        { "name": "adminRewardAccount", "isMut": true, "isSigner": false },
        { "name": "rewardTokenMint", "isMut": true, "isSigner": false },
        { "name": "feeRecipientTokenAccount", "isMut": true, "isSigner": false },
        { "name": "owner", "isMut": false, "isSigner": true },
        { "name": "tokenProgram", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "stakeEntryId", "type": "u64" }
      ]
    },
    {
      "name": "compoundRewards",
      "accounts": [
        { "name": "platform", "isMut": true, "isSigner": false },
        { "name": "userAccount", "isMut": true, "isSigner": false },
        { "name": "stakeEntry", "isMut": true, "isSigner": false },
        { "name": "rewardVault", "isMut": true, "isSigner": false },
        { "name": "adminRewardAccount", "isMut": true, "isSigner": false },
        { "name": "rewardTokenMint", "isMut": true, "isSigner": false },
        { "name": "feeRecipientTokenAccount", "isMut": true, "isSigner": false },
        { "name": "owner", "isMut": false, "isSigner": true },
        { "name": "tokenProgram", "isMut": false, "isSigner": false }
      ],
      "args": []
    },
    {
      "name": "unstake",
      "accounts": [
        { "name": "platform", "isMut": true, "isSigner": false },
        { "name": "userAccount", "isMut": true, "isSigner": false },
        { "name": "stakeEntry", "isMut": true, "isSigner": false },
        { "name": "userTokenAccount", "isMut": true, "isSigner": false },
        { "name": "stakeVault", "isMut": true, "isSigner": false },
        { "name": "adminStakeAccount", "isMut": true, "isSigner": false },
        { "name": "owner", "isMut": false, "isSigner": true },
        { "name": "tokenProgram", "isMut": false, "isSigner": false }
      ],
      "args": []
    },
    {
      "name": "setRewardRate",
      "accounts": [
        { "name": "platform", "isMut": true, "isSigner": false },
        { "name": "authority", "isMut": false, "isSigner": true }
      ],
      "args": [{ "name": "newRate", "type": "u64" }]
    },
    {
      "name": "setReferralRewardRate",
      "accounts": [
        { "name": "platform", "isMut": true, "isSigner": false },
        { "name": "authority", "isMut": false, "isSigner": true }
      ],
      "args": [{ "name": "newRate", "type": "u64" }]
    },
    {
      "name": "setAnnualEmission",
      "accounts": [
        { "name": "platform", "isMut": true, "isSigner": false },
        { "name": "authority", "isMut": false, "isSigner": true }
      ],
      "args": [{ "name": "annualEmission", "type": "u64" }]
    },
    {
      "name": "setBurnBps",
      "accounts": [
        { "name": "platform", "isMut": true, "isSigner": false },
        { "name": "authority", "isMut": false, "isSigner": true }
      ],
      "args": [{ "name": "burnBps", "type": "u64" }]
    },
    {
      "name": "blockUser",
      "accounts": [
        { "name": "platform", "isMut": false, "isSigner": false },
        { "name": "userAccount", "isMut": true, "isSigner": false },
        { "name": "authority", "isMut": false, "isSigner": true }
      ],
      "args": []
    },
    {
      "name": "unblockUser",
      "accounts": [
        { "name": "platform", "isMut": false, "isSigner": false },
        { "name": "userAccount", "isMut": true, "isSigner": false },
        { "name": "authority", "isMut": false, "isSigner": true }
      ],
      "args": []
    },
    {
      "name": "togglePause",
      "accounts": [
        { "name": "platform", "isMut": true, "isSigner": false },
        { "name": "authority", "isMut": false, "isSigner": true }
      ],
      "args": []
    },
    {
      "name": "setLockPeriodApy",
      "accounts": [
        { "name": "platform", "isMut": true, "isSigner": false },
        { "name": "authority", "isMut": false, "isSigner": true }
      ],
      "args": [
        { "name": "index", "type": "u8" },
        { "name": "apy", "type": "u64" }
      ]
    },
    {
      "name": "setBatchApy",
      "accounts": [
        { "name": "platform", "isMut": true, "isSigner": false },
        { "name": "authority", "isMut": false, "isSigner": true }
      ],
      "args": [
        { "name": "apyValues", "type": { "array": ["u64", 1] } }
      ]
    },
    {
      "name": "setTeamTargetTier",
      "accounts": [
        { "name": "platform", "isMut": true, "isSigner": false },
        { "name": "authority", "isMut": false, "isSigner": true }
      ],
      "args": [
        { "name": "index", "type": "u8" },
        { "name": "minTeamStaked", "type": "u64" },
        { "name": "bonusBps", "type": "u64" }
      ]
    },
    {
      "name": "updateUserTeamStats",
      "accounts": [
        { "name": "platform", "isMut": false, "isSigner": false },
        { "name": "userAccount", "isMut": true, "isSigner": false },
        { "name": "authority", "isMut": false, "isSigner": true }
      ],
      "args": [
        { "name": "teamSize", "type": "u64" },
        { "name": "teamTotalStaked", "type": "u64" }
      ]
    },
    {
      "name": "renounceOwnership",
      "accounts": [
        { "name": "platform", "isMut": true, "isSigner": false },
        { "name": "authority", "isMut": false, "isSigner": true }
      ],
      "args": []
    },
    {
      "name": "triggerHalving",
      "accounts": [
        { "name": "platform", "isMut": true, "isSigner": false },
        { "name": "caller", "isMut": true, "isSigner": true }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "Platform",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "authority", "type": "publicKey" },
          { "name": "rewardTokenMint", "type": "publicKey" },
          { "name": "stakeTokenMint", "type": "publicKey" },
          { "name": "rewardRate", "type": "u64" },
          { "name": "referralRewardRate", "type": "u64" },
          { "name": "totalStaked", "type": "u64" },
          { "name": "totalUsers", "type": "u64" },
          { "name": "rewardPoolBalance", "type": "u64" },
          { "name": "isPaused", "type": "bool" },
          { "name": "baseApy", "type": { "array": ["u64", 1] } },
          { "name": "teamTierMinStaked", "type": { "array": ["u64", 10] } },
          { "name": "teamTierBonusBps", "type": { "array": ["u64", 10] } },
          { "name": "totalBurned", "type": "u64" },
          { "name": "halvingEpoch", "type": "u64" },
          { "name": "halvingStartTime", "type": "i64" },
          { "name": "isRenounced", "type": "bool" },
          { "name": "feeRecipient", "type": "publicKey" },
          { "name": "totalFeesCollected", "type": "u64" },
          { "name": "bump", "type": "u8" },
          { "name": "totalReserve", "type": "u64" },
          { "name": "totalEmissionReleased", "type": "u64" },
          { "name": "emissionStartTime", "type": "i64" },
          { "name": "annualEmission", "type": "u64" },
          { "name": "burnBps", "type": "u64" }
        ]
      }
    },
    {
      "name": "UserAccount",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "owner", "type": "publicKey" },
          { "name": "totalStaked", "type": "u64" },
          { "name": "totalRewardsEarned", "type": "u64" },
          { "name": "totalReferralRewards", "type": "u64" },
          { "name": "referrer", "type": { "option": "publicKey" } },
          { "name": "referralCount", "type": "u64" },
          { "name": "isBlocked", "type": "bool" },
          { "name": "registeredAt", "type": "i64" },
          { "name": "teamSize", "type": "u64" },
          { "name": "teamTotalStaked", "type": "u64" },
          { "name": "bump", "type": "u8" },
          { "name": "stakeCount", "type": "u64" }
        ]
      }
    },
    {
      "name": "StakeEntry",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "owner", "type": "publicKey" },
          { "name": "amount", "type": "u64" },
          { "name": "lockPeriodIndex", "type": "u8" },
          { "name": "stakedAt", "type": "i64" },
          { "name": "unlockAt", "type": "i64" },
          { "name": "lastClaimAt", "type": "i64" },
          { "name": "totalClaimed", "type": "u64" },
          { "name": "isActive", "type": "bool" },
          { "name": "apy", "type": "u64" },
          { "name": "stakeId", "type": "u64" },
          { "name": "bump", "type": "u8" }
        ]
      }
    }
  ],
  "errors": [
    { "code": 6000, "name": "PlatformPaused", "msg": "Platform is paused" },
    { "code": 6001, "name": "Unauthorized", "msg": "Unauthorized" },
    { "code": 6002, "name": "InvalidAmount", "msg": "Invalid amount" },
    { "code": 6003, "name": "InvalidLockPeriod", "msg": "Invalid lock period" },
    { "code": 6004, "name": "LockPeriodActive", "msg": "Lock period is still active" },
    { "code": 6005, "name": "StakeNotActive", "msg": "Stake is not active" },
    { "code": 6006, "name": "NoRewardsToClaim", "msg": "No rewards to claim" },
    { "code": 6007, "name": "InsufficientRewardPool", "msg": "Insufficient reward pool" },
    { "code": 6008, "name": "ClaimTooEarly", "msg": "Claim too early - wait 12 hours" },
    { "code": 6009, "name": "UserBlocked", "msg": "User is blocked" },
    { "code": 6010, "name": "OverflowError", "msg": "Overflow error" },
    { "code": 6011, "name": "InvalidAdminAccount", "msg": "Invalid admin fee account" },
    { "code": 6012, "name": "InvalidMint", "msg": "Invalid token mint" },
    { "code": 6013, "name": "InvalidTierIndex", "msg": "Invalid tier index (0-9)" },
    { "code": 6014, "name": "TeamBonusTooHigh", "msg": "Team bonus BPS exceeds maximum" },
    { "code": 6015, "name": "SelfReferral", "msg": "Cannot refer yourself" },
    { "code": 6016, "name": "ReferrerMismatch", "msg": "Referrer account does not match referrer key" },
    { "code": 6017, "name": "InvalidVault", "msg": "Invalid vault account" },
    { "code": 6018, "name": "InvalidUserAccount", "msg": "Invalid user token account" },
    { "code": 6019, "name": "APYTooHigh", "msg": "APY exceeds maximum allowed value" },
    { "code": 6020, "name": "HalvingNotDue", "msg": "Halving is not due yet" },
    { "code": 6021, "name": "AlreadyRenounced", "msg": "Ownership has already been renounced" },
    { "code": 6022, "name": "InvalidFeeRecipient", "msg": "Fee recipient token account does not match" },
    { "code": 6023, "name": "BelowMinDeposit", "msg": "Deposit amount below minimum (1 FBiT)" },
    { "code": 6024, "name": "AboveMaxDeposit", "msg": "Deposit amount above maximum (800 M FBiT)" },
    { "code": 6025, "name": "ReserveNotFunded", "msg": "Reserve vault not funded yet" },
    { "code": 6026, "name": "NoEmissionAvailable", "msg": "No emission available to release yet" },
    { "code": 6027, "name": "AnnualEmissionNotSet", "msg": "Annual emission not configured" },
    { "code": 6028, "name": "BurnBpsTooHigh", "msg": "Burn BPS exceeds maximum (5000 = 50%)" },
    { "code": 6029, "name": "BelowMinStake", "msg": "Stake amount is below minimum (1 FBiT)" },
    { "code": 6030, "name": "AboveMaxStake", "msg": "Stake amount exceeds maximum (500M FBiT)" },
    { "code": 6031, "name": "InvalidReferralATA", "msg": "Invalid referral token account" }
  ]
};

export const IDL: FbitStaking = {
  "version": "0.1.0",
  "name": "fbit_staking",
  "instructions": [
    {
      "name": "initialize",
      "accounts": [
        { "name": "platform", "isMut": true, "isSigner": false },
        { "name": "authority", "isMut": true, "isSigner": true },
        { "name": "rewardTokenMint", "isMut": false, "isSigner": false },
        { "name": "stakeTokenMint", "isMut": false, "isSigner": false },
        { "name": "systemProgram", "isMut": false, "isSigner": false },
        { "name": "tokenProgram", "isMut": false, "isSigner": false },
        { "name": "rent", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "rewardRate", "type": "u64" },
        { "name": "referralRewardRate", "type": "u64" }
      ]
    },
    {
      "name": "fundRewardPool",
      "accounts": [
        { "name": "platform", "isMut": true, "isSigner": false },
        { "name": "authority", "isMut": true, "isSigner": true },
        { "name": "funderTokenAccount", "isMut": true, "isSigner": false },
        { "name": "rewardVault", "isMut": true, "isSigner": false },
        { "name": "tokenProgram", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "amount", "type": "u64" }
      ]
    },
    {
      "name": "refundRewardPool",
      "accounts": [
        { "name": "platform", "isMut": true, "isSigner": false },
        { "name": "authority", "isMut": false, "isSigner": true },
        { "name": "authorityTokenAccount", "isMut": true, "isSigner": false },
        { "name": "rewardVault", "isMut": true, "isSigner": false },
        { "name": "tokenProgram", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "amount", "type": "u64" }
      ]
    },
    {
      "name": "depositReserve",
      "accounts": [
        { "name": "platform", "isMut": true, "isSigner": false },
        { "name": "authority", "isMut": true, "isSigner": true },
        { "name": "funderTokenAccount", "isMut": true, "isSigner": false },
        { "name": "reserveVault", "isMut": true, "isSigner": false },
        { "name": "tokenProgram", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "amount", "type": "u64" }
      ]
    },
    {
      "name": "releaseEmission",
      "accounts": [
        { "name": "platform", "isMut": true, "isSigner": false },
        { "name": "reserveVault", "isMut": true, "isSigner": false },
        { "name": "rewardVault", "isMut": true, "isSigner": false },
        { "name": "tokenProgram", "isMut": false, "isSigner": false }
      ],
      "args": []
    },
    {
      "name": "registerUser",
      "accounts": [
        { "name": "platform", "isMut": true, "isSigner": false },
        { "name": "userAccount", "isMut": true, "isSigner": false },
        { "name": "referrerAccount", "isMut": true, "isSigner": false },
        { "name": "owner", "isMut": true, "isSigner": true },
        { "name": "systemProgram", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "referrer", "type": { "option": "publicKey" } }
      ]
    },
    {
      "name": "stake",
      "accounts": [
        { "name": "platform", "isMut": true, "isSigner": false },
        { "name": "userAccount", "isMut": true, "isSigner": false },
        { "name": "stakeEntry", "isMut": true, "isSigner": false },
        { "name": "userTokenAccount", "isMut": true, "isSigner": false },
        { "name": "stakeVault", "isMut": true, "isSigner": false },
        { "name": "adminStakeAccount", "isMut": true, "isSigner": false },
        { "name": "rewardVault", "isMut": true, "isSigner": false },
        { "name": "owner", "isMut": true, "isSigner": true },
        { "name": "tokenProgram", "isMut": false, "isSigner": false },
        { "name": "systemProgram", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "amount", "type": "u64" },
        { "name": "lockPeriodIndex", "type": "u8" }
      ]
    },
    {
      "name": "claimRewards",
      "accounts": [
        { "name": "platform", "isMut": true, "isSigner": false },
        { "name": "userAccount", "isMut": true, "isSigner": false },
        { "name": "stakeEntry", "isMut": true, "isSigner": false },
        { "name": "userTokenAccount", "isMut": true, "isSigner": false },
        { "name": "rewardVault", "isMut": true, "isSigner": false },
        { "name": "adminRewardAccount", "isMut": true, "isSigner": false },
        { "name": "rewardTokenMint", "isMut": true, "isSigner": false },
        { "name": "feeRecipientTokenAccount", "isMut": true, "isSigner": false },
        { "name": "owner", "isMut": false, "isSigner": true },
        { "name": "tokenProgram", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "stakeEntryId", "type": "u64" }
      ]
    },
    {
      "name": "compoundRewards",
      "accounts": [
        { "name": "platform", "isMut": true, "isSigner": false },
        { "name": "userAccount", "isMut": true, "isSigner": false },
        { "name": "stakeEntry", "isMut": true, "isSigner": false },
        { "name": "rewardVault", "isMut": true, "isSigner": false },
        { "name": "adminRewardAccount", "isMut": true, "isSigner": false },
        { "name": "rewardTokenMint", "isMut": true, "isSigner": false },
        { "name": "feeRecipientTokenAccount", "isMut": true, "isSigner": false },
        { "name": "owner", "isMut": false, "isSigner": true },
        { "name": "tokenProgram", "isMut": false, "isSigner": false }
      ],
      "args": []
    },
    {
      "name": "unstake",
      "accounts": [
        { "name": "platform", "isMut": true, "isSigner": false },
        { "name": "userAccount", "isMut": true, "isSigner": false },
        { "name": "stakeEntry", "isMut": true, "isSigner": false },
        { "name": "userTokenAccount", "isMut": true, "isSigner": false },
        { "name": "stakeVault", "isMut": true, "isSigner": false },
        { "name": "adminStakeAccount", "isMut": true, "isSigner": false },
        { "name": "owner", "isMut": false, "isSigner": true },
        { "name": "tokenProgram", "isMut": false, "isSigner": false }
      ],
      "args": []
    },
    {
      "name": "setRewardRate",
      "accounts": [
        { "name": "platform", "isMut": true, "isSigner": false },
        { "name": "authority", "isMut": false, "isSigner": true }
      ],
      "args": [{ "name": "newRate", "type": "u64" }]
    },
    {
      "name": "setReferralRewardRate",
      "accounts": [
        { "name": "platform", "isMut": true, "isSigner": false },
        { "name": "authority", "isMut": false, "isSigner": true }
      ],
      "args": [{ "name": "newRate", "type": "u64" }]
    },
    {
      "name": "setAnnualEmission",
      "accounts": [
        { "name": "platform", "isMut": true, "isSigner": false },
        { "name": "authority", "isMut": false, "isSigner": true }
      ],
      "args": [{ "name": "annualEmission", "type": "u64" }]
    },
    {
      "name": "setBurnBps",
      "accounts": [
        { "name": "platform", "isMut": true, "isSigner": false },
        { "name": "authority", "isMut": false, "isSigner": true }
      ],
      "args": [{ "name": "burnBps", "type": "u64" }]
    },
    {
      "name": "blockUser",
      "accounts": [
        { "name": "platform", "isMut": false, "isSigner": false },
        { "name": "userAccount", "isMut": true, "isSigner": false },
        { "name": "authority", "isMut": false, "isSigner": true }
      ],
      "args": []
    },
    {
      "name": "unblockUser",
      "accounts": [
        { "name": "platform", "isMut": false, "isSigner": false },
        { "name": "userAccount", "isMut": true, "isSigner": false },
        { "name": "authority", "isMut": false, "isSigner": true }
      ],
      "args": []
    },
    {
      "name": "togglePause",
      "accounts": [
        { "name": "platform", "isMut": true, "isSigner": false },
        { "name": "authority", "isMut": false, "isSigner": true }
      ],
      "args": []
    },
    {
      "name": "setLockPeriodApy",
      "accounts": [
        { "name": "platform", "isMut": true, "isSigner": false },
        { "name": "authority", "isMut": false, "isSigner": true }
      ],
      "args": [
        { "name": "index", "type": "u8" },
        { "name": "apy", "type": "u64" }
      ]
    },
    {
      "name": "setBatchApy",
      "accounts": [
        { "name": "platform", "isMut": true, "isSigner": false },
        { "name": "authority", "isMut": false, "isSigner": true }
      ],
      "args": [
        { "name": "apyValues", "type": { "array": ["u64", 1] } }
      ]
    },
    {
      "name": "setTeamTargetTier",
      "accounts": [
        { "name": "platform", "isMut": true, "isSigner": false },
        { "name": "authority", "isMut": false, "isSigner": true }
      ],
      "args": [
        { "name": "index", "type": "u8" },
        { "name": "minTeamStaked", "type": "u64" },
        { "name": "bonusBps", "type": "u64" }
      ]
    },
    {
      "name": "updateUserTeamStats",
      "accounts": [
        { "name": "platform", "isMut": false, "isSigner": false },
        { "name": "userAccount", "isMut": true, "isSigner": false },
        { "name": "authority", "isMut": false, "isSigner": true }
      ],
      "args": [
        { "name": "teamSize", "type": "u64" },
        { "name": "teamTotalStaked", "type": "u64" }
      ]
    },
    {
      "name": "renounceOwnership",
      "accounts": [
        { "name": "platform", "isMut": true, "isSigner": false },
        { "name": "authority", "isMut": false, "isSigner": true }
      ],
      "args": []
    },
    {
      "name": "triggerHalving",
      "accounts": [
        { "name": "platform", "isMut": true, "isSigner": false },
        { "name": "caller", "isMut": true, "isSigner": true }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "Platform",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "authority", "type": "publicKey" },
          { "name": "rewardTokenMint", "type": "publicKey" },
          { "name": "stakeTokenMint", "type": "publicKey" },
          { "name": "rewardRate", "type": "u64" },
          { "name": "referralRewardRate", "type": "u64" },
          { "name": "totalStaked", "type": "u64" },
          { "name": "totalUsers", "type": "u64" },
          { "name": "rewardPoolBalance", "type": "u64" },
          { "name": "isPaused", "type": "bool" },
          { "name": "baseApy", "type": { "array": ["u64", 1] } },
          { "name": "teamTierMinStaked", "type": { "array": ["u64", 10] } },
          { "name": "teamTierBonusBps", "type": { "array": ["u64", 10] } },
          { "name": "totalBurned", "type": "u64" },
          { "name": "halvingEpoch", "type": "u64" },
          { "name": "halvingStartTime", "type": "i64" },
          { "name": "isRenounced", "type": "bool" },
          { "name": "feeRecipient", "type": "publicKey" },
          { "name": "totalFeesCollected", "type": "u64" },
          { "name": "bump", "type": "u8" },
          { "name": "totalReserve", "type": "u64" },
          { "name": "totalEmissionReleased", "type": "u64" },
          { "name": "emissionStartTime", "type": "i64" },
          { "name": "annualEmission", "type": "u64" },
          { "name": "burnBps", "type": "u64" }
        ]
      }
    },
    {
      "name": "UserAccount",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "owner", "type": "publicKey" },
          { "name": "totalStaked", "type": "u64" },
          { "name": "totalRewardsEarned", "type": "u64" },
          { "name": "totalReferralRewards", "type": "u64" },
          { "name": "referrer", "type": { "option": "publicKey" } },
          { "name": "referralCount", "type": "u64" },
          { "name": "isBlocked", "type": "bool" },
          { "name": "registeredAt", "type": "i64" },
          { "name": "teamSize", "type": "u64" },
          { "name": "teamTotalStaked", "type": "u64" },
          { "name": "bump", "type": "u8" },
          { "name": "stakeCount", "type": "u64" }
        ]
      }
    },
    {
      "name": "StakeEntry",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "owner", "type": "publicKey" },
          { "name": "amount", "type": "u64" },
          { "name": "lockPeriodIndex", "type": "u8" },
          { "name": "stakedAt", "type": "i64" },
          { "name": "unlockAt", "type": "i64" },
          { "name": "lastClaimAt", "type": "i64" },
          { "name": "totalClaimed", "type": "u64" },
          { "name": "isActive", "type": "bool" },
          { "name": "apy", "type": "u64" },
          { "name": "stakeId", "type": "u64" },
          { "name": "bump", "type": "u8" }
        ]
      }
    }
  ],
  "errors": [
    { "code": 6000, "name": "PlatformPaused", "msg": "Platform is paused" },
    { "code": 6001, "name": "Unauthorized", "msg": "Unauthorized" },
    { "code": 6002, "name": "InvalidAmount", "msg": "Invalid amount" },
    { "code": 6003, "name": "InvalidLockPeriod", "msg": "Invalid lock period" },
    { "code": 6004, "name": "LockPeriodActive", "msg": "Lock period is still active" },
    { "code": 6005, "name": "StakeNotActive", "msg": "Stake is not active" },
    { "code": 6006, "name": "NoRewardsToClaim", "msg": "No rewards to claim" },
    { "code": 6007, "name": "InsufficientRewardPool", "msg": "Insufficient reward pool" },
    { "code": 6008, "name": "ClaimTooEarly", "msg": "Claim too early - wait 12 hours" },
    { "code": 6009, "name": "UserBlocked", "msg": "User is blocked" },
    { "code": 6010, "name": "OverflowError", "msg": "Overflow error" },
    { "code": 6011, "name": "InvalidAdminAccount", "msg": "Invalid admin fee account" },
    { "code": 6012, "name": "InvalidMint", "msg": "Invalid token mint" },
    { "code": 6013, "name": "InvalidTierIndex", "msg": "Invalid tier index (0-9)" },
    { "code": 6014, "name": "TeamBonusTooHigh", "msg": "Team bonus BPS exceeds maximum" },
    { "code": 6015, "name": "SelfReferral", "msg": "Cannot refer yourself" },
    { "code": 6016, "name": "ReferrerMismatch", "msg": "Referrer account does not match referrer key" },
    { "code": 6017, "name": "InvalidVault", "msg": "Invalid vault account" },
    { "code": 6018, "name": "InvalidUserAccount", "msg": "Invalid user token account" },
    { "code": 6019, "name": "APYTooHigh", "msg": "APY exceeds maximum allowed value" },
    { "code": 6020, "name": "HalvingNotDue", "msg": "Halving is not due yet" },
    { "code": 6021, "name": "AlreadyRenounced", "msg": "Ownership has already been renounced" },
    { "code": 6022, "name": "InvalidFeeRecipient", "msg": "Fee recipient token account does not match" },
    { "code": 6023, "name": "BelowMinDeposit", "msg": "Deposit amount below minimum (1 FBiT)" },
    { "code": 6024, "name": "AboveMaxDeposit", "msg": "Deposit amount above maximum (800 M FBiT)" },
    { "code": 6025, "name": "ReserveNotFunded", "msg": "Reserve vault not funded yet" },
    { "code": 6026, "name": "NoEmissionAvailable", "msg": "No emission available to release yet" },
    { "code": 6027, "name": "AnnualEmissionNotSet", "msg": "Annual emission not configured" },
    { "code": 6028, "name": "BurnBpsTooHigh", "msg": "Burn BPS exceeds maximum (5000 = 50%)" },
    { "code": 6029, "name": "BelowMinStake", "msg": "Stake amount is below minimum (1 FBiT)" },
    { "code": 6030, "name": "AboveMaxStake", "msg": "Stake amount exceeds maximum (500M FBiT)" },
    { "code": 6031, "name": "InvalidReferralATA", "msg": "Invalid referral token account" }
  ]
};
