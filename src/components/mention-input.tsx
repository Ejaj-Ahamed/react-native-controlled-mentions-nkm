import React, { FC, MutableRefObject, useMemo, useRef, useState } from 'react';
import {
  NativeSyntheticEvent,
  Text,
  TextInput,
  TextInputSelectionChangeEventData,
  View,
} from 'react-native';

import { MentionInputProps, MentionPartType, Suggestion } from '../types';
import {
  defaultMentionTextStyle,
  generateValueFromPartsAndChangedText,
  generateValueWithAddedSuggestion,
  getMentionPartSuggestionKeywords,
  isMentionPartType,
  parseValue,
  replaceMentionValues,
} from '../utils';

const MentionInput: FC<MentionInputProps> = ({
  value,
  onChange,

  partTypes = [],

  inputRef: propInputRef,

  containerStyle,

  onSelectionChange,

  ...textInputProps
}) => {
  const textInput = useRef<TextInput | null>(null);

  const [selection, setSelection] = useState({ start: 0, end: 0 });

  const [textBlocks, setTextBlocks] = useState<Array<String>>([]);
  const [textOnValueChange, setTextOnValueChange] = useState<String>('');

  const { plainText, parts } = useMemo(
    () => parseValue(value, partTypes),
    [value, partTypes]
  );

  const callOnValueChange = () => {
    if (textOnValueChange != value) {
      setTextBlocks([]);
      console.log(value, 'on value changed');
      let textzzz = replaceMentionValues(value, ({ name }) => {
        if (name.startsWith('＠')) {
          return `＠${name}`;
        }

        return `@${name}`;
      });
      console.log(textzzz, 'filtereed');

      let textBlockzz = textzzz.match(
        /(http?:\/\/[^\s]+)|(https?:\/\/[^\s]+)|([＠@#][a-z0-9_\.]+)/gi
      );
      let resArr = [];
      if (textBlockzz == null || textBlockzz[0] == '') {
        resArr.push(textzzz);
      }
      let flag = false;
      for (const ment of textBlockzz ?? []) {
        resArr.push(textzzz.substring(0, textzzz.indexOf(ment)));
        if (
          ment.startsWith('@') ||
          ment.startsWith('＠') ||
          ment.startsWith('#') ||
          ment.toLocaleLowerCase().startsWith('http')
        ) {
          resArr.push(ment);
        }
        textzzz = textzzz.substring(
          textzzz.indexOf(ment) + ment.length,
          textzzz.length
        );
        flag = true;
      }
      if (flag && textzzz.length > 0) {
        resArr.push(textzzz);
      }
      setTextBlocks([...resArr]);

      setTextOnValueChange(value);
      console.log(resArr);
    }
  };

  const handleSelectionChange = (
    event: NativeSyntheticEvent<TextInputSelectionChangeEventData>
  ) => {
    setSelection(event.nativeEvent.selection);

    onSelectionChange && onSelectionChange(event);
  };

  /**
   * Callback that trigger on TextInput text change
   *
   * @param changedText
   */
  const onChangeInput = (changedText: string) => {
    let changedTextVal = generateValueFromPartsAndChangedText(
      parts,
      plainText,
      changedText
    );
    onChange(changedTextVal);
  };

  /**
   * We memoize the keyword to know should we show mention suggestions or not
   */
  const keywordByTrigger = useMemo(() => {
    return getMentionPartSuggestionKeywords(
      parts,
      plainText,
      selection,
      partTypes
    );
  }, [parts, plainText, selection, partTypes]);

  /**
   * Callback on mention suggestion press. We should:
   * - Get updated value
   * - Trigger onChange callback with new value
   */
  const onSuggestionPress =
    (mentionType: MentionPartType) => (suggestion: Suggestion) => {
      const newValue = generateValueWithAddedSuggestion(
        parts,
        mentionType,
        plainText,
        selection,
        suggestion
      );

      if (!newValue) {
        return;
      }

      onChange(newValue);

      /**
       * Move cursor to the end of just added mention starting from trigger string and including:
       * - Length of trigger string
       * - Length of mention name
       * - Length of space after mention (1)
       *
       * Not working now due to the RN bug
       */
      // const newCursorPosition = currentPart.position.start + triggerPartIndex + trigger.length +
      // suggestion.name.length + 1;

      // textInput.current?.setNativeProps({selection: {start: newCursorPosition, end: newCursorPosition}});
    };

  const handleTextInputRef = (ref: TextInput) => {
    textInput.current = ref as TextInput;

    if (propInputRef) {
      if (typeof propInputRef === 'function') {
        propInputRef(ref);
      } else {
        (propInputRef as MutableRefObject<TextInput>).current =
          ref as TextInput;
      }
    }
  };

  const renderMentionSuggestions = (mentionType: MentionPartType) => (
    <React.Fragment key={mentionType.trigger}>
      {mentionType.renderSuggestions &&
        mentionType.renderSuggestions({
          keyword: keywordByTrigger[mentionType.trigger],
          onSuggestionPress: onSuggestionPress(mentionType),
        })}
    </React.Fragment>
  );

  const getPartStyle = (trigger: String) => {
    if (trigger == '@' || trigger == '＠') {
      return partTypes[0];
    } else if (trigger == '#') {
      return partTypes[1];
    } else if (trigger == 'Link') {
      return partTypes[2];
    }
  };
  let blockArr = ['1'];
  callOnValueChange();

  return (
    <View style={containerStyle}>
      {(
        partTypes.filter(
          (one) =>
            isMentionPartType(one) &&
            one.renderSuggestions != null &&
            !one.isBottomMentionSuggestionsRender
        ) as MentionPartType[]
      ).map(renderMentionSuggestions)}

      <TextInput
        multiline
        {...textInputProps}
        ref={handleTextInputRef}
        onChangeText={onChangeInput}
        onSelectionChange={handleSelectionChange}
      >
        <Text>
          {textBlocks?.map((ment) => {
            if (ment.startsWith('@')) {
              return (
                <Text
                  key={Math.random()}
                  style={
                    getPartStyle('@')?.textStyle || defaultMentionTextStyle
                  }
                >
                  {ment}
                </Text>
              );
            } else if (ment.startsWith('＠')) {
              return (
                <Text
                  key={Math.random()}
                  style={
                    getPartStyle('@')?.textStyle || defaultMentionTextStyle
                  }
                >
                  {ment}
                </Text>
              );
            } else if (ment.startsWith('#')) {
              return (
                <Text
                  key={Math.random()}
                  style={
                    getPartStyle('#')?.textStyle || defaultMentionTextStyle
                  }
                >
                  {ment}
                </Text>
              );
            } else if (ment.toLowerCase().startsWith('http')) {
              return (
                <Text
                  key={Math.random()}
                  style={
                    getPartStyle('Link')?.textStyle || defaultMentionTextStyle
                  }
                >
                  {ment}
                </Text>
              );
            } else {
              return <Text key={Math.random()}>{ment}</Text>;
            }
          })}
        </Text>
      </TextInput>

      {(
        partTypes.filter(
          (one) =>
            isMentionPartType(one) &&
            one.renderSuggestions != null &&
            one.isBottomMentionSuggestionsRender
        ) as MentionPartType[]
      ).map(renderMentionSuggestions)}
    </View>
  );
};

export { MentionInput };
