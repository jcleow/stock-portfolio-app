import axios from 'axios';

const SANDBOXTOKEN = 'Tsk_c0d79534cc3f4d8fa07478c311b898d2';
const GENERICURL = 'https://sandbox.iexapis.com/stable/stock';

export default function portfolios(db) {
  const index = async (req, res) => {
    if (req.middlewareLoggedIn) {
      const { loggedInUserId } = req.cookies;
      const loggedInUser = await db.User.findByPk(loggedInUserId);
      const arrayOfPortfolios = await loggedInUser.getPortfolios();
      res.send({ message: 'success', portfolios: arrayOfPortfolios });
      return;
    }
    res.send({ message: 'not logged in' });
  };
  const view = async (req, res) => {
    const { portfolioId } = req.params;
    try {
      const selectedPortfolio = await db.Portfolio.findByPk(portfolioId, {
        include: db.Stock,
      });
      // Retrieve individual stock symbols
      const selectedStockNames = selectedPortfolio.stocks.map((stock) => stock.stockSymbol);
      const selectedStockNamesString = selectedStockNames.join(',');
      const selectedStockIds = selectedPortfolio.stocks.map((stock) => ({ id: stock.id, symbol: stock.stockSymbol }));

      // Retrieve individual stock trades
      const selectedPortfolioStocks = await db.PortfolioStock.findAll({ where: { portfolioId } });
      const allTradesPromises = selectedPortfolioStocks.map(async (stock) => {
        const stockTrades = await stock.getTrades();
        return stockTrades;
      });
      // Retrieve individual stock trades and cumulative share holdings
      let arrayOfStockTrades;
      let arrayOfSharesOwned;
      Promise.all(allTradesPromises)
        .then((result) => {
          arrayOfStockTrades = result;
          console.log(result[0], 'result0');

          // Retrieve total shares owned in each stock
          arrayOfSharesOwned = arrayOfStockTrades.map((trade) => {
            const sharesPerStock = trade.reduce((acc, currTrade) => {
              if (currTrade.position === 'SELL') {
                return acc - currTrade.shares;
              }
              return acc + currTrade.shares;
            }, 0);
            return sharesPerStock;
          });
          console.log(arrayOfSharesOwned, 'arrayofSharesOwned');
        })
        .catch((err) => console.log(err));

      // get stock data in batch
      axios.get(`${GENERICURL}/market/batch?symbols=${selectedStockNamesString}&types=quote&token=${SANDBOXTOKEN}`)
        .then((batchResults) => {
          const batchQuotes = Object.values(batchResults.data);
          // Destructure the information from API call
          const essentialQuoteInfo = batchQuotes.map((stock, stockIndex) => {
            const {
              symbol, companyName, latestPrice, change, changePercent, avgTotalVolume, marketCap,
            } = stock.quote;
            // Search for the appropriate portfolio_stock_id to append to stockInfoObj
            const selectedPortfolioStock = selectedStockIds.find((stock) => stock.symbol === symbol.toLowerCase());

            const stockInfoObj = {
              portfolioId,
              portfolioStockId: selectedPortfolioStock.id,
              symbol,
              companyName,
              latestPrice,
              change,
              changePercent,
              avgTotalVolume,
              marketCap,
              trades: arrayOfStockTrades[stockIndex],
              totalSharesOwned: arrayOfSharesOwned[stockIndex],
            };
            return stockInfoObj;
          });

          res.send({ portfolioStocks: essentialQuoteInfo });
        })
        .catch((error) => console.log(error));
    } catch (error) {
      console.log(error);
    }
  };
  const update = async (req, res) => {
    const { tradesData } = req.body;
    console.log(tradesData, 'tradesData');
    const updatedTradeData = tradesData.map(async (trade) => {
      const {
        portfolioStockId, position, costPrice, tradeDate, shares,
      } = trade;

      let newTrade;

      if (!trade.id) {
        newTrade = await db.Trade.create({
          portfolioStockId, position, costPrice, tradeDate, shares,
        });
      } else {
        newTrade = await db.Trade.update({
          portfolioStockId,
          position,
          costPrice,
          tradeDate,
          shares,
        }, {
          where: {
            id: trade.id,
            portfolioStockId,
          },
        });
      }
      return newTrade;
    });
    Promise.all(updatedTradeData)
      .then((result) => {
        console.log(result, 'result');
        res.send({ message: 'newTradeCreated' });
      })
      .catch((err) => console.log(err));
  };

  return ({
    index,
    view,
    update,
  });
}
