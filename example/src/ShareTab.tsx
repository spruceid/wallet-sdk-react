import * as React from 'react';

import { Button, ScrollView, Switch, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import styles from './Styles';
import { BleSessionManager, type ItemsRequestDocType, type PermittedItemDocType, type PermittedItemNamespace } from 'react-native-wallet-sdk';

interface FlatItemsRequest {
    docType: string,
    namespace: string,
    key: string,
    retain: boolean,
    selected: boolean,
}

function flattenItemsRequests(items: ItemsRequestDocType[]): FlatItemsRequest[] {
    const flattened: FlatItemsRequest[] = [];
    items.map((docType) => {
        docType.namespaces.map((namespace) => {
            namespace.kvPairs.map((kvPair) => {
                flattened.push({
                    docType: docType.docType,
                    namespace: namespace.namespace,
                    key: kvPair.key,
                    retain: kvPair.value,
                    selected: false,
                });
            });
        });
    });

    return flattened;
}

interface IdleState {
    kind: "idle"
}

interface QrCodeState {
    kind: "qrCode",
    qrCodeUri: string,
}

interface ErrorState {
    kind: "error",
    error: string,
}

interface SelectNamespaceState {
    kind: "selectNamespace"
    itemsRequest: FlatItemsRequest[],
}

interface ProgressState {
    kind: "progress",
    progressMsg: string,
}

interface SuccessState {
    kind: "success",
}

type State = IdleState | QrCodeState | ErrorState | SelectNamespaceState | SuccessState | ProgressState;

export default function ShareTab() {
    const [state, setState] = React.useState<State>({kind: "idle"});

    React.useEffect(() => {
        const callback = {
            update: function(state: any) {
                console.log("got state", state);
                switch(state.kind) {
                    case 'sessionEngagingQrCode': {
                        setState({
                            kind: "qrCode",
                            qrCodeUri: state.qrCodeUri,
                        })
                    } break;

                    case 'error': {
                        setState({
                            kind: "error",
                            error: state.error,
                        })
                    } break;

                    case 'selectNamespace': {
                        setState({
                            kind: "selectNamespace",
                            itemsRequest: flattenItemsRequests(state.itemsRequest),
                        });
                    } break;

                    case 'progress': {
                        setState({
                            kind: 'progress',
                            progressMsg: state.progressMsg,
                        })
                    } break;

                    case 'success': {
                        setState({
                            kind: 'success'
                        })
                    } break;
                }
            },
        };

        BleSessionManager.registerCallback(callback);

        return () => {
            BleSessionManager.unRegisterCallback(callback);
        };
    });

    const presentButtonOnPress = () => {
        console.log('share', globalThis.mdocUuid, globalThis.privateKeyUuid);

        BleSessionManager.startPresentMdoc(globalThis.mdocUuid, globalThis.privateKeyUuid, "qrCode");

        console.log("started presentation");
    };

    const shareButtonOnPress = () => {
        switch(state.kind) {
            case "selectNamespace": {
                let permitted: PermittedItemDocType[] = [];
                state.itemsRequest.map((item: FlatItemsRequest) => {
                    if(!item.selected) {
                        return;
                    }
                    let permittedDoc: PermittedItemDocType | undefined = undefined;
                    permitted.map((previousDoc) => {
                        if(item.docType === previousDoc.docType) {
                            permittedDoc = previousDoc;
                        }
                    });
                    if(permittedDoc === undefined) {
                        permittedDoc = {
                            docType: item.docType,
                            namespaces: [],
                        };
                        permitted.push(permittedDoc);
                    }
        
                    let permittedNamespace: PermittedItemNamespace | undefined = undefined;
                    permittedDoc.namespaces.map((previousNamespace) => {
                        if(item.namespace === previousNamespace.namespace) {
                            permittedNamespace = previousNamespace;
                        }
                    })
                    if(permittedNamespace === undefined) {
                        permittedNamespace = {
                            namespace: item.namespace,
                            keys: [],
                        };
                        permittedDoc.namespaces.push(permittedNamespace);
                    }
        
                    permittedNamespace.keys.push(item.key);
                });
                BleSessionManager.submitNamespaces(permitted)        
            } break;
        }
    };

    const cancelButtonOnPress = () => {
        BleSessionManager.cancel();
    };

    const onSelectiveDisclosureToggled = (value: boolean, curItem: FlatItemsRequest) => {
        if(state.kind == "selectNamespace") {
            const newItems: FlatItemsRequest[] = state.itemsRequest.map((oldItem: FlatItemsRequest) => {
                let newItem: FlatItemsRequest = {... oldItem};
                if(curItem.docType === oldItem.docType && curItem.namespace === oldItem.namespace && curItem.key === oldItem.key) {
                    newItem.selected = value;
                }
                return newItem;
            });

            setState({
                kind: "selectNamespace",
                itemsRequest: newItems,
            });
        }
    };

    let element = null;

    switch(state.kind) {
        case "idle":
            break;
        case "error":
            element = (<Text>Error: {state.error}</Text>);
            break;
        case 'qrCode':
            element = (<QRCode value={state.qrCodeUri}/>);
            break;
        case 'selectNamespace':
            element = (
                <View>
                    {state.itemsRequest.map((item: FlatItemsRequest) => {
                        const key = item.docType + ":" + item.namespace + ":" + item.key;

                        return (
                            <View key={key}>
                                <View>
                                    <Text>{key}</Text>
                                        {item.retain && <Text>This piece of information will be retained by the reader.</Text>}
                                </View>
                                <Switch onValueChange={(value) => onSelectiveDisclosureToggled(value, item)} value={item.selected}/>
                            </View>
                        )
                    })}
                    <Button title="Share" onPress={shareButtonOnPress}/>
                </View>
            );
            break;
        case 'progress':
            element = (<Text>{state.progressMsg}</Text>);
            break;
        case 'success':
            element = (<Text>Success</Text>);
            break;
    }

    let cancelButton = null;
    if(state.kind !== 'idle' && state.kind != 'success') {
        cancelButton = (<Button title="Cancel" onPress={cancelButtonOnPress}/>);
    }

    return (
        <ScrollView>
            <View style={styles.container}>
                <Button title='Present with QR Code' onPress={presentButtonOnPress}/>
                {element != null && element}
                {cancelButton != null && cancelButton}
            </View>
        </ScrollView>
    )
}