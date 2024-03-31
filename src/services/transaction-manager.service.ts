import { TransactionModel } from '../domain/transaction.model';
import { MoneyModel } from '../domain/money.model';
import { AccountsRepository } from '../repository/accounts.repository';
import dayjs from 'dayjs';
import { AccountType } from '../domain/account-type.enum';
import { convert } from '../utils/money.utils';

export class TransactionManagerService {

  public transfer(fromAccountId: string, toAccountId: string, value: MoneyModel): TransactionModel {

    if (fromAccountId === toAccountId) { // transfers cannot be performed between one account and itself
      throw new Error('Cannot make a transfer to the same account');
    }

    const fromAccount = AccountsRepository.get(fromAccountId);
    const toAccount = AccountsRepository.get(toAccountId);

    if (!fromAccount || !toAccount) {
      throw new Error('Specified account does not exist');
    }

    if (fromAccount.accountType === AccountType.SAVINGS) { // transfers cannot be performed from Savings Accounts
      throw new Error('The transfer functionality cannot be performed from a Savings Account');
    }

    const amountDeducted = convert(value, fromAccount.balance.currency); // value converted to the currency of the fromAccount

    if (fromAccount.balance.amount < amountDeducted.amount) { // the result of the transfer must not lead to negative account balance
      throw new Error('Insufficient funds');
    }

    const amountAdded = convert(value, toAccount.balance.currency); // value converted to the currency of the toAccount

    const transaction = new TransactionModel({
      id: crypto.randomUUID(),
      from: fromAccountId,
      to: toAccountId,
      amount: amountAdded, // changed from value to amountAdded, which represents the value converted to the currency of the target account
      timestamp: dayjs().toDate(),
    });

    fromAccount.balance.amount -= amountDeducted.amount; // deduct the amount to be deducted from the fromAccount's balance
    fromAccount.transactions = [...fromAccount.transactions, transaction];
    toAccount.balance.amount += amountAdded.amount; // add the amount to be added to the toAccount's balance
    toAccount.transactions = [...toAccount.transactions, transaction];

    return transaction;
  }

  public withdraw(accountId: string, amount: MoneyModel): TransactionModel {
    const fromAccount = AccountsRepository.get(accountId);

    if (!fromAccount) {
      throw new Error('Specified account does not exist');
    }

    if (fromAccount.balance.currency !== amount.currency) { // making sure that amount is in the same currency as the fromAccount's currency
      amount.amount = convert(amount, fromAccount.balance.currency).amount;
      amount.currency = fromAccount.balance.currency;
    }

    if (fromAccount.balance.amount < amount.amount) { // the result of the withdrawal must not lead to negative account balance
      throw new Error('Insufficient funds');
    }

    const transaction = new TransactionModel({
      id: crypto.randomUUID(),
      from: accountId,
      to: accountId,
      amount: amount,
      timestamp: dayjs().toDate(),
    });

    fromAccount.balance.amount -= amount.amount; // amount withdrawn is deducted from the fromAccount's balance
    fromAccount.transactions = [...fromAccount.transactions, transaction];

    return transaction;
  }

  public checkFunds(accountId: string): MoneyModel {
    if (!AccountsRepository.exist(accountId)) {
      throw new Error('Specified account does not exist');
    }
    return AccountsRepository.get(accountId)!.balance;
  }

  public retrieveTransactions(accountId: string): TransactionModel[] {
    if (!AccountsRepository.exist(accountId)) {
      throw new Error('Specified account does not exist');
    }
    return AccountsRepository.get(accountId)!.transactions;
  }
}

export const TransactionManagerServiceInstance = new TransactionManagerService();
