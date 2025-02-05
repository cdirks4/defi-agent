#![cfg_attr(not(feature = "std"), no_std)]
use stylus_sdk::{
    alloy_primitives::Address,
    prelude::*,
};

#[derive(Debug)]
pub enum TradingError {
    InsufficientBalance,
    InvalidAmount,
    Unauthorized,
}

sol_storage! {
    #[entrypoint]
    pub struct TradingAgent {
        address owner;
        mapping(address => uint256) balances;
        mapping(address => bool) authorized_agents;
    }
}

#[external]
impl TradingAgent {
    pub fn constructor(&mut self) {
        self.owner.set(msg::sender());
    }

    #[payable]
    pub fn execute_trade(
        &mut self,
        token: Address,
        amount: U256,
        is_buy: bool,
    ) -> Result<bool, TradingError> {
        if !self.authorized_agents.get(msg::sender()) {
            return Err(TradingError::Unauthorized);
        }

        if amount == U256::ZERO {
            return Err(TradingError::InvalidAmount);
        }

        if is_buy {
            self.balances.insert(token, self.balances.get(token) + amount);
        } else {
            let balance = self.balances.get(token);
            if balance < amount {
                return Err(TradingError::InsufficientBalance);
            }
            self.balances.insert(token, balance - amount);
        }

        Ok(true)
    }

    pub fn authorize_agent(&mut self, agent: Address) -> Result<bool, TradingError> {
        if msg::sender() != self.owner.get() {
            return Err(TradingError::Unauthorized);
        }
        self.authorized_agents.insert(agent, true);
        Ok(true)
    }
} 