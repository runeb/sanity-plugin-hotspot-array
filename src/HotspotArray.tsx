/* eslint-disable react/display-name */

// @ts-ignore
import sanityClient from 'part:@sanity/base/client'
// @ts-ignore
import {withDocument} from 'part:@sanity/form-builder'

import React from 'react'
import {Card, Flex, Stack, Text} from '@sanity/ui'
import {FormBuilderInput} from '@sanity/form-builder/lib/FormBuilderInput'
import {randomKey} from '@sanity/util/content'
import {PatchEvent, setIfMissing, set, insert} from '@sanity/form-builder/PatchEvent'
import imageUrlBuilder from '@sanity/image-url'
import {getImageDimensions} from '@sanity/asset-utils'
import get from 'lodash/get'

import Spot from './Spot'
import { useUnsetInputComponent } from './useUnsetInputComponent'
import Feedback from './Feedback'

const builder = imageUrlBuilder(sanityClient)
const urlFor = (source) => builder.image(source)
const imageStyle = {width: `100%`, height: `auto`}


const HotspotArray = React.forwardRef((props, ref) => {
  const {type, value, onChange, document: sanityDocument} = props

  // Attempt prevention of infinite loop in <FormBuilderInput />
  // Re-renders can still occur if this Component is used again in a nested field
  const typeWithoutInputComponent = useUnsetInputComponent(type, type?.inputComponent)

  // Finding the image from the document,
  // using the path from the hotspot's `options` field
  const displayImage = React.useMemo(() => {
    const hotspotImage = get(sanityDocument, type?.options?.hotspotImagePath)

    if (hotspotImage?.asset?._ref) {
      const {aspectRatio} = getImageDimensions(hotspotImage.asset._ref)
      const width = 600
      const height = Math.round(width / aspectRatio)
      const url = urlFor(hotspotImage).width(width).url()

      return {width, height, url}
    }

    return null
  }, [sanityDocument, type])

  const handleHotspotImageClick = React.useCallback((event) => {
    const {nativeEvent} = event

    // Calculate the x/y percentage of the click position
    const x = Number(((nativeEvent.offsetX * 100) / nativeEvent.srcElement.width).toFixed(2))
    const y = Number(((nativeEvent.offsetY * 100) / nativeEvent.srcElement.height).toFixed(2))
    const description = `New Hotspot at ${x}% x ${y}%`

    const newRow = {
      _key: randomKey(12),
      _type: `spot`,
      x,
      y,
    }

    if (type?.options?.hotspotDescriptionPath) {
      console.log(type.options.hotspotDescriptionPath);
      newRow[type.options.hotspotDescriptionPath] = description
    }

    onChange(PatchEvent.from(setIfMissing([]), insert([newRow], 'after', [-1])))
  }, [])

  const handleHotspotMove = React.useCallback(
    (key, x, y) => {
      if (!Number(x) || !Number(y)) {
        console.warn(`Missing or non-number X or Y`, {x, y})
        return
      }

      onChange(
        PatchEvent.from(
          // Set the `x` value of this array key item
          set(x, [{_key: key}, 'x']),
          // Set the `y` value of this array key item
          set(y, [{_key: key}, 'y'])
        )
      )
    },
    [value]
  )

  const hotspotImageRef = React.useRef(null)

  return (
    <Stack space={[2,2,3]}>
      {displayImage?.url ? (
        <div style={{position: `relative`}}>
          {value?.length > 0 &&
            value.map((spot) => (
              <Spot
                key={spot._key}
                spot={spot}
                bounds={hotspotImageRef}
                update={handleHotspotMove}
                hotspotDescriptionPath={type?.options?.hotspotDescriptionPath}
              />
            ))}

          <Card __unstable_checkered shadow={1}>
            <Flex align="center" justify="center">
              <img
                ref={hotspotImageRef}
                src={displayImage.url}
                width={displayImage.width}
                height={displayImage.height}
                alt=""
                style={imageStyle}
                onClick={handleHotspotImageClick}
                />
            </Flex>
          </Card>
        </div>
      ) : (
        <Feedback>
            {type?.options?.hotspotImagePath 
              ? <>No Hotspot image found at path <code>{type?.options?.hotspotImagePath}</code></> 
              : <>Define a path in this field using to the image field in this document at <code>options.hotspotImagePath</code></>
            }
          </Feedback>
      )}
      <FormBuilderInput {...props} type={typeWithoutInputComponent} ref={ref} />
    </Stack>
  )
})

export default withDocument(HotspotArray)
