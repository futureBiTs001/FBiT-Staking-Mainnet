// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title WrappedFuturebit
 * @notice ERC-20 token on Polygon: 1,000,000,000 WFBIT minted to deployer at launch.
 *         6 decimals — matches the FBiT staking contract expectation.
 *         logoURI() returns the token logo stored on IPFS.
 */
contract WrappedFuturebit is ERC20, ERC20Burnable, Ownable {
    uint8   private constant _DECIMALS       = 6;
    uint256 public  constant INITIAL_SUPPLY  = 1_000_000_000 * (10 ** 6); // 1 billion WFBIT

    string private _logoURI;

    constructor(address initialOwner, string memory logo)
        ERC20("Wrapped Futurebit", "WFBIT")
        Ownable(initialOwner)
    {
        _logoURI = logo;
        _mint(initialOwner, INITIAL_SUPPLY);
    }

    function decimals() public pure override returns (uint8) {
        return _DECIMALS;
    }

    /// @notice Returns the IPFS URI of the token logo.
    function logoURI() external view returns (string memory) {
        return _logoURI;
    }

    /// @notice Owner can update the logo URI if needed.
    function setLogoURI(string calldata newLogo) external onlyOwner {
        _logoURI = newLogo;
    }
}
