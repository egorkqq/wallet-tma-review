import { useMemo, useEffect, useState, ChangeEventHandler } from 'react';
import Page from '../../components/containers/Page';
import Section from '../../components/containers/Section';
import Delimiter from '../../components/typography/Delimiter';
import Row from '../../components/containers/Row';
import { iconReverseButton } from '../../assets/icons/buttons';
import SendAsset from './sendAsset';
import ReceiveAsset from './receiveAsset';
import AssetsList from './assetsList';
import { AddressType, DEX, pTON } from '@ston-fi/sdk';
import { useTonAddress, useTonConnectUI } from '@tonconnect/ui-react';
import { useClosure } from '../../hooks/useClosure';
import { useApiWalletInfoMutation } from '../../features/wallet/walletApi';
import { WalletInfoData } from '../../types/wallet';
import { CoinDto } from '../../types/assest';
import { useTonClient } from '../../hooks/useTonClient';
import { toNano } from '@ton/core';

import './index.css';
import useLanguage from '../../hooks/useLanguage';
import { usePage } from '../../hooks/usePage';
import { useTmaMainButton } from '../../hooks/useTma';
import { useNavigate } from 'react-router-dom';

import congratulateImg from "../../assets/images/congretulate.png";
import { useGetStonfiAssetsQuery } from '../../features/stonfi/stonFiApi';
import { useTransaction } from '../../hooks/useTransaction';
import PartialContent from '../../components/ui/modals/PartialContent';
import { formatDate } from 'date-fns';

export type AssetDataType = {
  title: string;
  icon: string;
  balance: number;
  value?: string;
  address?: string;
};

export type JetonWalletType = {
  address: string;
  balance: string;
  owner: string;
  jetton: string;
  last_transaction_lt: string;
  code_hash: string;
  data_hash: string;
};

type SwapDataType = {
  send: AssetDataType;
  receive: AssetDataType;
};

const swapData: SwapDataType = {
  send: {
    title: '',
    balance: 0,
    icon: '',
    address: '',
    value: '',
  },
  receive: {
    title: '',
    balance: 0,
    icon: '',
    address: '',
    value: '',
  } satisfies AssetDataType,
};


const Swap = () => {
  const { data: stonFiAssets, isLoading } = useGetStonfiAssetsQuery(null)
  const [swapAssets, setSwappAssets] = useState(swapData);
  const [showAssetsList, setShowAssetsList] = useState(false);
  const [swappingTokenMode, setSwappingTokenMode] = useState<
    'send' | 'receive' | null
  >(null);
  const [assets, setAssets] = useState<CoinDto[] | null>(null);
  const page = usePage();
  const btn = useTmaMainButton();

  const [tonConnectUI] = useTonConnectUI();
  const { client: tonClient } = useTonClient();
  const wallet = useTonAddress();
  const [walletInfoApi] = useApiWalletInfoMutation();
  const t = useLanguage('swap');
  const transaction = useTransaction()
  const navigate = useNavigate()

  useEffect(() => {
    page.setLoading(isLoading)
  }, [isLoading])

  useEffect(() => {
    walletInfoApi(null)
      .unwrap()
      .then((result: WalletInfoData) => {
        const { assets } = result.wallets[result.currentWallet];
        setAssets(assets);
        page.setLoading(false);
        btn.init(t('page-title'), swapHanler, true);
      })
      .catch((e) => {
        console.error(e)
        page.setLoading(false);
      });
  }, []);

  const combinedAssets = useMemo(() => {
    if (assets && stonFiAssets) {
      const _stonFiAssets = stonFiAssets.filter((stonFiAsset) => {
        return !assets.find(asset => asset.meta?.symbol?.toLowerCase() === stonFiAsset?.meta?.symbol?.toLowerCase())
      })
      const _assets = (new Array()).concat(assets, _stonFiAssets)
      return _assets
    }
    return [] as CoinDto[]
  }, [assets, stonFiAssets])

  const sendingAsset: CoinDto = useMemo(() => {
    if (combinedAssets.length) {
      return combinedAssets.find(
        (asset) => asset.meta?.address === swapAssets.send.address
      );
    }
  }, [swapAssets.send.address]);

  const receivingAsset: CoinDto = useMemo(() => {
    if (combinedAssets.length) {
      return combinedAssets.find(
        (asset) => asset.meta?.address === swapAssets.receive.address
      );
    }
  }, [swapAssets.receive.address]);

  useEffect(() => {
    if (sendingAsset && receivingAsset) {
      transaction.init({
        commission: 0.17,
        returnValue: 0.125,
        address: receivingAsset.meta?.address as string,
        completeIcon: congratulateImg,
        completeTitle: t("transaction-complete-title")
      })
    }
  }, [
    sendingAsset,
    receivingAsset
  ])

  const calculateSwappValues = (
    value: number | string,
    mode: 'send' | 'receive'
  ) => {
    const _value = Number(value);
    console.log("calc", _value, mode)
    if (mode === 'send') {
      return receivingAsset
        ? (Number(sendingAsset?.usdPrice) * _value) /
            Number(receivingAsset?.usdPrice)
        : undefined;
    }
    if (mode === 'receive') {
      return sendingAsset
        ? (Number(receivingAsset?.usdPrice) * _value) /
            Number(sendingAsset?.usdPrice)
        : undefined;
    }
  };

  const reverseSwaping = () => {
    setSwappAssets((prevData) => {
      const { send, receive } = prevData;
      return { send: receive, receive: send };
    });
  };

  const changeReceiveValue = (value: string) => {
    setSwappAssets(({ send, receive }) => {
      const sendedValue = calculateSwappValues(value, 'receive') || '';
      return {
        send: { ...send, value: sendedValue?.toString() },
        receive: { ...receive, value },
      } satisfies SwapDataType;
    });
  };

  const changeReceiveHandler: ChangeEventHandler<HTMLInputElement> = (e) => {
    changeReceiveValue(e.currentTarget.value);
  };

  const changeSendValue = (value: string) => {
    const receivedValue = calculateSwappValues(value, 'send') || '';
    setSwappAssets(({ send, receive }) => {
      return {
        send: { ...send, value },
        receive: { ...receive, value: receivedValue?.toString() },
      } satisfies SwapDataType;
    });
  };

  const changeSendHandler: ChangeEventHandler<HTMLInputElement> = (e) => {
    changeSendValue(e.currentTarget.value);
  };

  const chooseAssetHandler = useClosure((mode: 'send' | 'receive') => {
    setSwappingTokenMode(mode);
    setShowAssetsList(true);
  });

  const closeAssetsList = () => {
    setSwappingTokenMode(null);
    setShowAssetsList(false);
  };

  const setJeton = (asset: CoinDto) => {
    setSwappAssets(({ send, receive }) => {
      if (swappingTokenMode === 'send') {
        const sendedValue =
          (Number(receivingAsset?.usdPrice) * Number(receive.value)) /
            asset.usdPrice || '';
        return {
          send: {
            title: asset.meta?.symbol as string,
            balance: asset.amount ?? 0,
            icon: (asset.meta?.image || asset.meta?.imageData && `data:image/png;base64, ${asset.meta?.imageData}`) as string,
            address: asset.meta?.address,
            value: sendedValue.toString(),
          },
          receive,
        } satisfies SwapDataType;
      } else {
        const receivedValue =
          (Number(sendingAsset?.usdPrice) * Number(send.value)) /
            asset.usdPrice || '';
        return {
          send,
          receive: {
            title: asset.meta?.symbol as string,
            balance: asset.amount ?? 0,
            icon: (asset.meta?.image || asset.meta?.imageData && `data:image/png;base64, ${asset.meta?.imageData}`) as string,
            address: asset.meta?.address,
            value: receivedValue.toString(),
          },
        } satisfies SwapDataType;
      }
    });
    setShowAssetsList(false);
  };

  const swapHanler = () => {
    transactionSuccessHandler()
  };

  const delay = (time: number) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(true);
      }, time);
    });
  };

  const transactionSuccessHandler = async () => {
    const types = [sendingAsset?.type, receivingAsset?.type];
    try {
      if (types.includes('ton')) {
        types[0] === 'ton'
          ? await tonToJettonTransaction()
          : await jettonToTonTransaction();
      } else {
        await jettonToJettonTransaction();
      }
      transaction.open()
      await delay(5000);
      
    } catch (e) {
      console.error(e);
    }
  };

  const jettonToTonTransaction = async () => {
    if (!tonClient) {
      throw new Error("TonClient doesn't exists");
    }
    const router = tonClient.open(new DEX.v1.Router());

    const swapTxParams = await router.getSwapJettonToTonTxParams({
      userWalletAddress: wallet,
      offerJettonAddress: sendingAsset?.meta?.address as AddressType,
      offerAmount: toNano(
        Math.round(Number(swapAssets.send.value) *
          Math.pow(10, sendingAsset?.meta?.decimals as number))
      ),
      proxyTon: new pTON.v1(),
      minAskAmount: toNano(
        Math.round((Number(swapAssets.receive.value) + 0.17) * -1e9)
      ),
    });

    await tonConnectUI.sendTransaction({
      validUntil: Date.now() + 1000000,
      messages: [
        {
          address: swapTxParams.to.toString(),
          amount: swapTxParams.value.toString(),
          payload: swapTxParams.body?.toBoc().toString('base64'),
        },
      ],
    });
  };

  const jettonToJettonTransaction = async () => {
    if (!tonClient) {
      throw new Error("TonClient doesn't exists");
    }
    const router = tonClient.open(new DEX.v1.Router());

    const swapTxParams = await router.getSwapJettonToJettonTxParams({
      userWalletAddress: wallet,
      offerJettonAddress: sendingAsset?.meta?.address as AddressType,
      offerAmount: toNano(
        Math.round(Number(swapAssets.send.value) *
          Math.pow(10, sendingAsset?.meta?.decimals as number))
      ),
      askJettonAddress: receivingAsset?.meta?.address as AddressType,
      minAskAmount: toNano(
        Math.round((Number(swapAssets.receive.value) + 0.22) * -1e9)
      ),
    });

    await tonConnectUI.sendTransaction({
      validUntil: Date.now() + 1000000,
      messages: [
        {
          address: swapTxParams.to.toString(),
          amount: swapTxParams.value.toString(),
          payload: swapTxParams.body?.toBoc().toString('base64'),
        },
      ],
    });
  };

  const tonToJettonTransaction = async () => {
    if (!tonClient) {
      throw new Error("TonClient doesn't exists");
    }
    const router = tonClient.open(new DEX.v1.Router());

    const swapTxParams = await router.getSwapTonToJettonTxParams({
      userWalletAddress: wallet,
      askJettonAddress: receivingAsset?.meta?.address as AddressType,
      offerAmount: toNano(
        Math.round(Number(swapAssets.send.value) *
          Math.pow(10, sendingAsset?.meta?.decimals as number))
      ),
      proxyTon: new pTON.v1(),
      minAskAmount: toNano(
        Math.round((Number(swapAssets.receive.value) + 0.185) * -1e9)
      ),
    });

    await tonConnectUI.sendTransaction({
      validUntil: Date.now() + 1000000,
      messages: [
        {
          address: swapTxParams.to.toString(),
          amount: swapTxParams.value.toString(),
          payload: swapTxParams.body?.toBoc().toString('base64'),
        },
      ],
    });
  };

  const [isValidSwapp, setIsValidSwapp] = useState<boolean>(false);

  useEffect(() => {
    const isValid: boolean =
      !!sendingAsset &&
      !!receivingAsset &&
      sendingAsset.amount > 0 &&
      sendingAsset.amount - Number(swapAssets.send.value) > 0 &&
      !!swapAssets.send.value &&
      !!swapAssets.receive.value;
    setIsValidSwapp(isValid);
  }, [sendingAsset, receivingAsset, swapAssets]);

  useEffect(() => {
    btn.setVisible(isValidSwapp);
  }, [isValidSwapp]);

  const onComplete = () => {
    navigate("/bank/buy")
  }
  return (
    <Page title={t('page-title')} className="swap">
      <Delimiter />
      <SendAsset
        asset={swapAssets.send}
        onChange={changeSendHandler}
        forceChange={changeSendValue}
        onClick={chooseAssetHandler('send')}
        value={swapAssets.send.value || ''}
        coin={sendingAsset}
        disabled={!sendingAsset || !receivingAsset || sendingAsset.amount <= 0}
      />
      <Delimiter>
        <img src={iconReverseButton} alt="" onClick={reverseSwaping} />
      </Delimiter>
      <ReceiveAsset
        asset={swapAssets.receive}
        onChange={changeReceiveHandler}
        onClick={chooseAssetHandler('receive')}
        value={swapAssets.receive.value || ''}
        coin={receivingAsset}
        sendedCoin={sendingAsset}
        disabled={!sendingAsset || !receivingAsset || sendingAsset.amount <= 0}
      />

      <Section>
        <Delimiter />
        <Row className="justify-between swap-info-row">
          <div>{t('receive-value-title')}</div>
          <div>
            {sendingAsset &&
              receivingAsset &&
              (
                (Number(swapAssets.send.value) - 0.17) *
                sendingAsset.usdPrice
              ).toLocaleString(undefined, {
                style: 'currency',
                currency: 'USD',
              })}
          </div>
        </Row>
        <Delimiter />
        <Row className="justify-between swap-info-row">
          <div>{t('route')}</div>
          {sendingAsset && receivingAsset && (
            <div>
              {sendingAsset?.meta?.symbol} {'»'} {receivingAsset?.meta?.symbol}
            </div>
          )}
        </Row>
        <Delimiter />
      </Section>
      {showAssetsList && (
        <AssetsList
          onClose={closeAssetsList}
          onJetonSelect={setJeton}
          assets={combinedAssets}
          excludeAssets={{ send: sendingAsset, receive: receivingAsset }}
        />
      )}
      {transaction.isOpen && (
        <PartialContent wait={[transaction.isOpen]} init={transaction.setPartialContent}>
          <Row className="transaction-assets">
            <img src={sendingAsset?.meta?.image} alt="" />
            <img src={receivingAsset?.meta?.image} alt="" />
          </Row>
          <div className="">
            -{swapAssets.send.value} {sendingAsset?.meta?.symbol}
          </div>
          <div className="">
            +{swapAssets.receive.value} {receivingAsset?.meta?.symbol}
          </div>
          <div className="secondary-data">
            {Number(swapAssets.receive.value) * Number(receivingAsset?.usdPrice)} $
          </div>
          <div className="secondary-data">
            {t('page-title')} {formatDate(new Date(), "d MMMM, hh:mm")}
          </div>
        </PartialContent>
      )}
      {transaction.isComplete && (
        <PartialContent wait={[transaction.isComplete]} init={transaction.setPartialContent}>
          <div>
            {t("transaction-complete-description")} 
          </div>
          <button onClick={onComplete} className="primary-button rounded-button">{t("transaction-complete-button")}</button>
        </PartialContent>
      )}
    </Page>
  );
};

export default Swap;
